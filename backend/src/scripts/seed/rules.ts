import { Finishing, PropertyType } from '../../common/enums/unit-attributes';
import { Vibe } from './data';

export interface TypeSpec {
  label: string;
  size: [number, number];
  rooms: [number, number];
  priceFactor: number;
  apartmentLike: boolean;
}

export const TYPE_SPECS: Record<PropertyType, TypeSpec> = {
  [PropertyType.STUDIO]: {
    label: 'Studio',
    size: [40, 70],
    rooms: [1, 1],
    priceFactor: 1.0,
    apartmentLike: true,
  },
  [PropertyType.APARTMENT]: {
    label: 'Apartment',
    size: [85, 220],
    rooms: [1, 4],
    priceFactor: 1.0,
    apartmentLike: true,
  },
  [PropertyType.SERVICED_APARTMENT]: {
    label: 'Serviced Apartment',
    size: [60, 160],
    rooms: [1, 3],
    priceFactor: 1.15,
    apartmentLike: true,
  },
  [PropertyType.DUPLEX]: {
    label: 'Duplex',
    size: [180, 320],
    rooms: [3, 5],
    priceFactor: 1.05,
    apartmentLike: true,
  },
  [PropertyType.PENTHOUSE]: {
    label: 'Penthouse',
    size: [160, 350],
    rooms: [2, 5],
    priceFactor: 1.15,
    apartmentLike: true,
  },
  [PropertyType.CHALET]: {
    label: 'Chalet',
    size: [70, 180],
    rooms: [1, 4],
    priceFactor: 1.0,
    apartmentLike: true,
  },
  [PropertyType.TOWNHOUSE]: {
    label: 'Townhouse',
    size: [180, 280],
    rooms: [3, 5],
    priceFactor: 1.1,
    apartmentLike: false,
  },
  [PropertyType.TWIN_HOUSE]: {
    label: 'Twin House',
    size: [230, 350],
    rooms: [3, 6],
    priceFactor: 1.15,
    apartmentLike: false,
  },
  [PropertyType.VILLA]: {
    label: 'Villa',
    size: [300, 700],
    rooms: [4, 8],
    priceFactor: 1.3,
    apartmentLike: false,
  },
};

export const FINISHING_FACTOR: Record<Finishing, number> = {
  [Finishing.CORE_SHELL]: 0.85,
  [Finishing.SEMI_FINISHED]: 0.95,
  [Finishing.FULLY_FINISHED]: 1.05,
  [Finishing.FURNISHED]: 1.15,
};

export const SEA_VIEW_FACTOR = 1.1;
export const READY_FACTOR = 1.05;
export const PRICE_NOISE = 0.08;

export const TYPE_MIX: Record<Vibe, Partial<Record<PropertyType, number>>> = {
  family: {
    [PropertyType.STUDIO]: 4,
    [PropertyType.APARTMENT]: 34,
    [PropertyType.DUPLEX]: 10,
    [PropertyType.PENTHOUSE]: 5,
    [PropertyType.TOWNHOUSE]: 15,
    [PropertyType.TWIN_HOUSE]: 12,
    [PropertyType.VILLA]: 14,
    [PropertyType.SERVICED_APARTMENT]: 6,
  },
  urban: {
    [PropertyType.STUDIO]: 18,
    [PropertyType.APARTMENT]: 42,
    [PropertyType.SERVICED_APARTMENT]: 16,
    [PropertyType.DUPLEX]: 9,
    [PropertyType.PENTHOUSE]: 9,
    [PropertyType.TOWNHOUSE]: 6,
  },
  investment: {
    [PropertyType.STUDIO]: 22,
    [PropertyType.APARTMENT]: 38,
    [PropertyType.SERVICED_APARTMENT]: 22,
    [PropertyType.DUPLEX]: 6,
    [PropertyType.PENTHOUSE]: 6,
    [PropertyType.TOWNHOUSE]: 6,
  },
  beach: {
    [PropertyType.CHALET]: 45,
    [PropertyType.TOWNHOUSE]: 12,
    [PropertyType.TWIN_HOUSE]: 12,
    [PropertyType.VILLA]: 22,
    [PropertyType.PENTHOUSE]: 5,
    [PropertyType.STUDIO]: 4,
  },
};

export function roomsForSize(type: PropertyType, size: number): number {
  const [min, max] = TYPE_SPECS[type].rooms;
  return Math.min(max, Math.max(min, Math.round(size / 60)));
}

export function bathroomsFor(rooms: number, size: number): number {
  const base = Math.max(1, Math.round(rooms * 0.75));
  return Math.min(rooms + 1, base + (size > 250 ? 1 : 0));
}
