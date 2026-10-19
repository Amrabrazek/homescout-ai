export const PROPERTY_TYPES = [
  'studio',
  'apartment',
  'duplex',
  'penthouse',
  'townhouse',
  'twin_house',
  'villa',
  'chalet',
  'serviced_apartment',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** A unit as the /internal API returns it. Cards are drawn only from these. */
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
  finishing: string | null;
  view: string | null;
  amenities: string[];
  description: string | null;
  /** Null for units without plan data. */
  paymentPlan: PaymentPlanValue | null;
}

export interface PaymentPlanValue {
  downPaymentPct: number;
  installmentYears: number;
  downPayment: number;
  months: number;
  monthlyInstallment: number;
  /** What the payments are worth in today's money. Null when the flag is off. */
  presentValue: number | null;
  /** presentValue / price, 0..1. */
  shareOfPrice: number | null;
  /** Yearly discount rate, e.g. 0.2. */
  discountRate: number | null;
}

export interface UnitSearchResult {
  total: number;
  units: UnitCard[];
  appliedFilters: Record<string, unknown>;
  unmatched: string[];
}

export interface SimilarUnit {
  unit: UnitCard;
  reasons: string[];
}

export interface BuyerPreferences {
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  propertyTypes: PropertyType[];
  minRooms: number | null;
  minSize: number | null;
  amenities: string[];
  savedUnitIds: string[];
  unmatched?: string[];
}

export interface ContextUnit {
  id: string;
  name: string;
  project: string | null;
  area: string | null;
  propertyType: PropertyType | null;
  rooms: number;
  price: number;
}

/** GET /internal/context: what the concierge knows before the chat starts. */
export interface BuyerContext {
  preferences: Omit<BuyerPreferences, 'savedUnitIds' | 'unmatched'>;
  saved: ContextUnit[];
  viewed: ContextUnit[];
  skipped: ContextUnit[];
}
