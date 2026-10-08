export const PROPERTY_TYPES = [
  'STUDIO',
  'APARTMENT',
  'DUPLEX',
  'PENTHOUSE',
  'TOWNHOUSE',
  'TWIN_HOUSE',
  'VILLA',
  'CHALET',
  'SERVICED_APARTMENT',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const BUYER_EVENT_TYPES = ['view', 'save', 'skip'] as const;

export type BuyerEventType = (typeof BUYER_EVENT_TYPES)[number];

export interface BuyerActivity {
  views: number;
  saves: number;
  skips: number;
}

export interface BuyerProfile {
  id: string;
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  propertyTypes: PropertyType[];
  minRooms: number | null;
  minSize: number | null;
  amenityIds: string[];
  savedUnitIds: string[];
  hasTasteVector: boolean;
  activity: BuyerActivity;
}

export interface PreferenceOptions {
  areas: string[];
  amenities: { id: string; name: string }[];
}
