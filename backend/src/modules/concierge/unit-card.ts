import {
  Finishing,
  PropertyType,
  UnitView,
} from '../../common/enums/unit-attributes';

/** The fields both a Unit entity and a search document carry. */
export interface UnitLike {
  id: string;
  name: string;
  rooms: number;
  bathrooms: number;
  floorArea: number | string;
  price: number | string;
  floor?: number;
  description?: string;
  propertyType?: PropertyType;
  finishing?: Finishing;
  view?: UnitView;
  deliveryYear?: number | null;
  project?: {
    name: string;
    area?: string | null;
    city?: string | null;
    region?: string | null;
    developer?: { name: string } | null;
  } | null;
  amenities?: { name: string }[] | null;
  images?: { url: string }[] | null;
}

/** What the agent sees and the chat draws as a card. Every value comes from the DB. */
export interface UnitCard {
  id: string;
  name: string;
  project: string | null;
  developer: string | null;
  area: string | null;
  city: string | null;
  propertyType: PropertyType | null;
  rooms: number;
  bathrooms: number;
  floorArea: number;
  price: number;
  deliveryYear: number | null;
  imageUrl: string | null;
}

export interface UnitDetail extends UnitCard {
  floor: number | null;
  finishing: Finishing | null;
  view: UnitView | null;
  amenities: string[];
  description: string | null;
}

const DESCRIPTION_LIMIT = 600;

export function toUnitCard(unit: UnitLike): UnitCard {
  return {
    id: unit.id,
    name: unit.name,
    project: unit.project?.name ?? null,
    developer: unit.project?.developer?.name ?? null,
    area: unit.project?.area ?? null,
    city: unit.project?.city ?? null,
    propertyType: unit.propertyType ?? null,
    rooms: unit.rooms,
    bathrooms: unit.bathrooms,
    floorArea: Number(unit.floorArea),
    price: Number(unit.price),
    deliveryYear: unit.deliveryYear ?? null,
    imageUrl: unit.images?.[0]?.url ?? null,
  };
}

export function toUnitDetail(unit: UnitLike): UnitDetail {
  const description = unit.description?.trim() || null;
  return {
    ...toUnitCard(unit),
    floor: unit.floor ?? null,
    finishing: unit.finishing ?? null,
    view: unit.view ?? null,
    amenities: (unit.amenities ?? []).map((a) => a.name),
    description:
      description && description.length > DESCRIPTION_LIMIT
        ? `${description.slice(0, DESCRIPTION_LIMIT)}…`
        : description,
  };
}
