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
