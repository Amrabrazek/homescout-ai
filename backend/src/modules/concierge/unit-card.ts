import {
  Finishing,
  PropertyType,
  UnitView,
} from '../../common/enums/unit-attributes';
import { paymentPlanValue, PlanValue } from '../unit/payment-plan';

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
  downPaymentPct?: number | string | null;
  installmentYears?: number | null;
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
  /** Null for units without plan data. */
  paymentPlan: UnitPaymentPlan | null;
}

/** The value fields are null when PLAN_VALUE_ENABLED=false. */
export interface UnitPaymentPlan
  extends Omit<PlanValue, 'presentValue' | 'shareOfPrice' | 'discountRate'> {
  downPaymentPct: number;
  installmentYears: number;
  presentValue: number | null;
  shareOfPrice: number | null;
  discountRate: number | null;
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

export function toUnitDetail(
  unit: UnitLike,
  discountRate: number | null
): UnitDetail {
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
    paymentPlan: toPaymentPlan(unit, discountRate),
  };
}

function toPaymentPlan(
  unit: UnitLike,
  discountRate: number | null
): UnitPaymentPlan | null {
  const plan = paymentPlanValue(unit, discountRate ?? 0);
  if (!plan) return null;
  return {
    downPaymentPct: Number(unit.downPaymentPct ?? 0),
    installmentYears: unit.installmentYears ?? 0,
    ...plan,
    ...(discountRate == null && {
      presentValue: null,
      shareOfPrice: null,
      discountRate: null,
    }),
  };
}
