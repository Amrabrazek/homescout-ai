import { PropertyType } from '../../common/enums/unit-attributes';
import { UpdatePreferencesInput } from '../../modules/buyer/dto/update-preferences.input';
import { EvalUnit } from '../eval-unit';

/**
 * A buyer with stated preferences (hard) and a taste the preferences can't
 * express (soft). The eval saves a few units that match both, then checks
 * whether the feed brings more of that taste.
 */
export interface Persona {
  key: string;
  name: string;
  preferences: UpdatePreferencesInput;
  taste: { label: string; matches: (unit: EvalUnit) => boolean };
}

/** A query whose leftover text (after parsing) only embeddings can rank. */
export interface SemanticQuery {
  query: string;
  relevant: { label: string; matches: (unit: EvalUnit) => boolean };
}

const M = 1_000_000;
const { APARTMENT, STUDIO, VILLA, CHALET, TOWNHOUSE, TWIN_HOUSE } =
  PropertyType;

const ready = (u: EvalUnit) => u.deliveryYear == null;
const finished = (u: EvalUnit) =>
  u.finishing === 'fully_finished' || u.finishing === 'furnished';
const has = (amenity: string) => (u: EvalUnit) => u.amenities.includes(amenity);

export const PERSONAS: Persona[] = [
  {
    key: 'young-couple',
    name: "Young couple's first home",
    preferences: {
      propertyTypes: [APARTMENT],
      areas: ['New Cairo', 'Fifth Settlement', 'Madinaty'],
      budgetMax: 8 * M,
      minRooms: 2,
    },
    taste: { label: 'finished, no fit-out', matches: finished },
  },
  {
    key: 'family',
    name: 'Family that needs space for kids',
    preferences: {
      propertyTypes: [TOWNHOUSE, TWIN_HOUSE],
      areas: ['Sheikh Zayed', 'New Zayed', '6th of October'],
      minRooms: 3,
    },
    taste: { label: 'schools nearby', matches: has('Schools Nearby') },
  },
  {
    key: 'investor',
    name: 'Investor buying to rent out',
    preferences: { propertyTypes: [STUDIO, APARTMENT], budgetMax: 6 * M },
    taste: {
      label: 'furnished and ready to rent',
      matches: (u) => u.finishing === 'furnished',
    },
  },
  {
    key: 'summer',
    name: 'Summer-home buyer',
    preferences: {
      propertyTypes: [CHALET],
      areas: ['Ras El Hekma', 'Sidi Abdel Rahman', 'New Alamein'],
    },
    taste: { label: 'sea view', matches: (u) => u.view === 'sea' },
  },
  {
    key: 'luxury',
    name: 'Luxury villa buyer',
    preferences: { propertyTypes: [VILLA], budgetMin: 30 * M },
    taste: { label: 'sea view', matches: (u) => u.view === 'sea' },
  },
  {
    key: 'remote-worker',
    name: 'Remote worker who wants to move in soon',
    preferences: { propertyTypes: [STUDIO, APARTMENT], budgetMax: 5 * M },
    taste: {
      label: 'ready or delivered by 2027',
      matches: (u) => ready(u) || u.deliveryYear <= 2027,
    },
  },
];

/**
 * One buyer, two unrelated tastes and no stated preferences. A single mean
 * taste vector can land between them and match neither: the case for #50.
 */
export const TWO_TASTE_BUYER = {
  name: 'Two tastes: beach chalet + city villa',
  tastes: [
    {
      label: 'North Coast sea-view chalet',
      matches: (u: EvalUnit) =>
        u.propertyType === CHALET &&
        u.region === 'North Coast' &&
        u.view === 'sea',
    },
    {
      label: 'West Cairo garden villa',
      matches: (u: EvalUnit) =>
        u.propertyType === VILLA &&
        u.region === 'West Cairo' &&
        u.view === 'garden',
    },
  ],
};

export const SEMANTIC_QUERIES: SemanticQuery[] = [
  {
    query: 'chalet with a sea view',
    relevant: { label: 'sea view', matches: (u) => u.view === 'sea' },
  },
  {
    query: 'ready to move apartment in New Cairo',
    relevant: { label: 'ready to move', matches: ready },
  },
  {
    query: 'fully finished apartment, no hassle',
    relevant: { label: 'fully finished or furnished', matches: finished },
  },
  {
    query: 'furnished studio to rent out',
    relevant: {
      label: 'furnished',
      matches: (u) => u.finishing === 'furnished',
    },
  },
  {
    query: 'duplex with a private garden',
    relevant: { label: 'private garden', matches: has('Private Garden') },
  },
  {
    query: 'family townhouse near good schools',
    relevant: { label: 'schools nearby', matches: has('Schools Nearby') },
  },
  {
    query: 'villa with beach access',
    relevant: { label: 'beach access', matches: has('Beach Access') },
  },
  {
    query: 'pet friendly apartment',
    relevant: { label: 'pet friendly', matches: has('Pet Friendly') },
  },
  {
    query: 'townhouse with a playground for the kids',
    relevant: { label: 'has a playground', matches: has('Playground') },
  },
  {
    query: 'smart home apartment',
    relevant: { label: 'smart home', matches: has('Smart Home') },
  },
  {
    query: 'townhouse overlooking the garden',
    relevant: { label: 'garden view', matches: (u) => u.view === 'garden' },
  },
  {
    query: 'apartment with a gym',
    relevant: { label: 'has a gym', matches: has('Gym') },
  },
  {
    query: 'core and shell villa I can finish my way',
    relevant: {
      label: 'core & shell',
      matches: (u) => u.finishing === 'core_shell',
    },
  },
  {
    query: 'serviced apartment ready now for investment',
    relevant: { label: 'ready to move', matches: ready },
  },
  {
    query: 'penthouse with a city view',
    relevant: { label: 'city view', matches: (u) => u.view === 'city' },
  },
  {
    query: 'chalet by the pool in Ain Sokhna',
    relevant: { label: 'pool view', matches: (u) => u.view === 'pool' },
  },
];
