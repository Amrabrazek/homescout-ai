import {
  Finishing,
  PropertyType,
  UnitView,
} from '../../common/enums/unit-attributes';
import { AMENITY_ICONS } from './amenity-icons';
import {
  AREAS,
  AreaDef,
  DEVELOPERS,
  IMAGES,
  ImageKind,
  PROJECTS,
  imageUrl,
} from './data';
import { describeUnit } from './describe';
import { Rng } from './rng';
import {
  FINISHING_FACTOR,
  PRICE_NOISE,
  READY_FACTOR,
  SEA_VIEW_FACTOR,
  TYPE_MIX,
  TYPE_SPECS,
  bathroomsFor,
  roomsForSize,
} from './rules';

export const DEFAULT_SEED = 20260101;
const BASE_DATE = Date.UTC(2026, 8, 1);
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUSE_TYPES = [
  PropertyType.TOWNHOUSE,
  PropertyType.TWIN_HOUSE,
  PropertyType.VILLA,
];

export interface SeedProject {
  name: string;
  developer: string;
  area: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
}

export interface SeedUnit {
  project: number;
  name: string;
  number: string;
  floor: number;
  rooms: number;
  bathrooms: number;
  floorArea: number;
  price: number;
  description: string;
  propertyType: PropertyType;
  finishing: Finishing;
  deliveryYear: number | null;
  downPaymentPct: number;
  installmentYears: number;
  view: UnitView;
  amenities: string[];
  images: number[];
  createdAt: Date;
}

export interface SeedDataset {
  developers: string[];
  amenities: { name: string; icon: string }[];
  images: { url: string; altText: string }[];
  projects: SeedProject[];
  units: SeedUnit[];
}

interface ProjectContext {
  area: AreaDef;
  premium: number;
  maxFloor: number;
  block: string;
}

export function generateDataset(seed = DEFAULT_SEED): SeedDataset {
  const rng = new Rng(seed);
  const areasByKey = new Map(AREAS.map((a) => [a.key, a]));

  const projects: SeedProject[] = [];
  const contexts: ProjectContext[] = [];
  for (const def of PROJECTS) {
    const area = areasByKey.get(def.area);
    projects.push({
      name: def.name,
      developer: def.developer,
      area: area.name,
      city: area.city,
      region: area.region,
      lat: round(area.lat + rng.float(-0.02, 0.02), 6),
      lng: round(area.lng + rng.float(-0.02, 0.02), 6),
    });
    contexts.push({
      area,
      premium: rng.next(),
      maxFloor:
        area.vibe === 'beach'
          ? rng.int(2, 4)
          : area.vibe === 'family'
            ? rng.int(4, 8)
            : rng.int(8, 25),
      block: rng.pick(['A', 'B', 'C', 'D', 'E', 'G', 'H', 'K', 'M', 'P']),
    });
  }

  const units: SeedUnit[] = [];
  contexts.forEach((ctx, projectIndex) => {
    const count = rng.int(20, 50);
    for (let i = 0; i < count; i++) {
      units.push(generateUnit(rng, ctx, projectIndex, projects, i + 1));
    }
  });

  return {
    developers: [...DEVELOPERS],
    amenities: Object.entries(AMENITY_ICONS).map(([name, icon]) => ({
      name,
      icon,
    })),
    images: IMAGES.map((img) => ({
      url: imageUrl(img.id),
      altText: img.altText,
    })),
    projects,
    units,
  };
}

function generateUnit(
  rng: Rng,
  ctx: ProjectContext,
  projectIndex: number,
  projects: SeedProject[],
  sequence: number
): SeedUnit {
  const { area } = ctx;
  const propertyType = rng.weighted(TYPE_MIX[area.vibe]);
  const spec = TYPE_SPECS[propertyType];

  const floorArea = Math.round(
    (rng.float(...spec.size) + rng.float(...spec.size)) / 2
  );
  const rooms = roomsForSize(propertyType, floorArea);
  const bathrooms = bathroomsFor(rooms, floorArea);
  const floor = floorFor(rng, propertyType, ctx.maxFloor);
  const finishing = finishingFor(rng, propertyType, area);
  const view = viewFor(rng, propertyType, floor, area);

  const deliveryRoll = rng.weighted({
    ready: 35,
    '2027': 20,
    '2028': 20,
    '2029': 15,
    '2030': 10,
  });
  const deliveryYear = deliveryRoll === 'ready' ? null : Number(deliveryRoll);

  const [bandMin, bandMax] = area.pricePerM2;
  const pricePerM2 =
    (bandMin + ctx.premium * (bandMax - bandMin)) *
    spec.priceFactor *
    FINISHING_FACTOR[finishing] *
    (view === UnitView.SEA ? SEA_VIEW_FACTOR : 1) *
    (deliveryYear === null ? READY_FACTOR : 1) *
    (1 + rng.float(-PRICE_NOISE, PRICE_NOISE));
  const price = Math.round((pricePerM2 * floorArea) / 10_000) * 10_000;

  const downPaymentPct =
    deliveryYear === null ? rng.int(4, 10) * 5 : rng.int(0, 3) * 5;
  const installmentYears =
    deliveryYear === null ? rng.int(0, 4) : rng.int(5, 10);

  const luxury =
    ctx.premium > 0.7 ||
    propertyType === PropertyType.VILLA ||
    propertyType === PropertyType.PENTHOUSE;
  const amenities = amenitiesFor(rng, propertyType, floor, area, luxury);

  const unit: Omit<SeedUnit, 'description'> = {
    project: projectIndex,
    name: unitName(propertyType, rooms, view),
    number: HOUSE_TYPES.includes(propertyType)
      ? `${spec.label[0]}-${100 + sequence}`
      : `${ctx.block}${rng.int(1, 30)}-${String(floor).padStart(2, '0')}${String(rng.int(1, 8)).padStart(2, '0')}`,
    floor,
    rooms,
    bathrooms,
    floorArea,
    price,
    propertyType,
    finishing,
    deliveryYear,
    downPaymentPct,
    installmentYears,
    view,
    amenities,
    images: imagesFor(rng, propertyType, area, amenities),
    createdAt: new Date(
      BASE_DATE - rng.int(0, 180) * DAY_MS - rng.int(0, DAY_MS / 1000) * 1000
    ),
  };

  return {
    ...unit,
    description: describeUnit(rng, unit, projects[projectIndex], area),
  };
}

function floorFor(rng: Rng, type: PropertyType, maxFloor: number): number {
  switch (type) {
    case PropertyType.TOWNHOUSE:
    case PropertyType.TWIN_HOUSE:
    case PropertyType.VILLA:
      return 0;
    case PropertyType.PENTHOUSE:
      return maxFloor;
    case PropertyType.DUPLEX:
      return rng.chance(0.5) ? 0 : maxFloor - 1;
    case PropertyType.CHALET:
      return rng.int(0, Math.min(3, maxFloor));
    default:
      return rng.int(0, maxFloor);
  }
}

function finishingFor(rng: Rng, type: PropertyType, area: AreaDef): Finishing {
  if (type === PropertyType.SERVICED_APARTMENT) {
    return rng.weighted({
      [Finishing.FURNISHED]: 70,
      [Finishing.FULLY_FINISHED]: 30,
    });
  }
  if (area.vibe === 'beach') {
    return rng.weighted({
      [Finishing.FULLY_FINISHED]: 50,
      [Finishing.FURNISHED]: 30,
      [Finishing.SEMI_FINISHED]: 20,
    });
  }
  if (HOUSE_TYPES.includes(type)) {
    return rng.weighted({
      [Finishing.CORE_SHELL]: 30,
      [Finishing.SEMI_FINISHED]: 40,
      [Finishing.FULLY_FINISHED]: 30,
    });
  }
  return rng.weighted({
    [Finishing.CORE_SHELL]: 10,
    [Finishing.SEMI_FINISHED]: 30,
    [Finishing.FULLY_FINISHED]: 50,
    [Finishing.FURNISHED]: 10,
  });
}

function viewFor(
  rng: Rng,
  type: PropertyType,
  floor: number,
  area: AreaDef
): UnitView {
  if (area.coastal && (area.vibe === 'beach' || floor >= 4)) {
    return rng.weighted({
      [UnitView.SEA]: 50,
      [UnitView.POOL]: 25,
      [UnitView.GARDEN]: 25,
    });
  }
  if (HOUSE_TYPES.includes(type)) {
    return rng.weighted({
      [UnitView.GARDEN]: 70,
      [UnitView.POOL]: 20,
      [UnitView.STREET]: 10,
    });
  }
  if (floor >= 5) {
    return rng.weighted({
      [UnitView.CITY]: 50,
      [UnitView.GARDEN]: 25,
      [UnitView.POOL]: 15,
      [UnitView.STREET]: 10,
    });
  }
  return rng.weighted({
    [UnitView.GARDEN]: 35,
    [UnitView.POOL]: 20,
    [UnitView.STREET]: 35,
    [UnitView.CITY]: 10,
  });
}

function amenitiesFor(
  rng: Rng,
  type: PropertyType,
  floor: number,
  area: AreaDef,
  luxury: boolean
): string[] {
  const apartmentLike = TYPE_SPECS[type].apartmentLike;
  const byVibe = (probs: Record<AreaDef['vibe'], number>) =>
    rng.chance(probs[area.vibe]);
  const out: string[] = [];
  const add = (name: string, condition: boolean) => {
    if (condition) out.push(name);
  };

  add('24/7 Security', rng.chance(0.9));
  add('Covered Parking', rng.chance(apartmentLike ? 0.7 : 0.5));
  add(
    'Elevator',
    apartmentLike && type !== PropertyType.CHALET && rng.chance(0.95)
  );
  add('Balcony', apartmentLike && rng.chance(0.75));
  add('Central AC', rng.chance(luxury ? 0.8 : 0.35));
  add(
    'Swimming Pool',
    byVibe({ beach: 0.9, family: 0.5, urban: 0.3, investment: 0.35 }) ||
      (luxury && rng.chance(0.5))
  );
  add(
    'Gym',
    type === PropertyType.SERVICED_APARTMENT
      ? rng.chance(0.9)
      : rng.chance(0.45)
  );
  add('Pet Friendly', rng.chance(0.3));
  add('Smart Home', rng.chance(luxury ? 0.6 : 0.05));
  add(
    'Playground',
    byVibe({ family: 0.8, beach: 0.4, urban: 0.2, investment: 0.2 })
  );
  add(
    'Beach Access',
    area.coastal && area.vibe === 'beach' && rng.chance(0.95)
  );
  add(
    'Clubhouse',
    byVibe({ family: 0.7, beach: 0.5, urban: 0.2, investment: 0.2 })
  );
  add(
    'Schools Nearby',
    byVibe({ family: 0.8, urban: 0.5, investment: 0.4, beach: 0 })
  );
  add(
    'Private Garden',
    (!apartmentLike && rng.chance(0.95)) ||
      (apartmentLike && floor === 0 && rng.chance(0.6))
  );
  return out;
}

function imagesFor(
  rng: Rng,
  type: PropertyType,
  area: AreaDef,
  amenities: string[]
): number[] {
  const byKind = (kind: ImageKind) =>
    IMAGES.map((img, i) => ({ img, i }))
      .filter(({ img }) => img.kind === kind)
      .map(({ i }) => i);
  const exteriorKind: ImageKind =
    area.vibe === 'beach'
      ? 'beach'
      : HOUSE_TYPES.includes(type)
        ? 'house'
        : 'apartment';

  const picked = [
    ...rng.sample(byKind(exteriorKind), rng.int(1, 2)),
    ...rng.sample(byKind('interior'), rng.int(3, 4)),
  ];
  if (amenities.includes('Swimming Pool')) {
    picked.push(rng.pick(byKind('pool')));
  }
  return picked;
}

function unitName(type: PropertyType, rooms: number, view: UnitView): string {
  const label = TYPE_SPECS[type].label;
  const base =
    type === PropertyType.STUDIO ? label : `${rooms}-Bedroom ${label}`;
  return view === UnitView.SEA ? `Sea-View ${base}` : base;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
