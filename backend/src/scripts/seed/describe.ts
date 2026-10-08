import {
  Finishing,
  PropertyType,
  UnitView,
} from '../../common/enums/unit-attributes';
import { AreaDef } from './data';
import type { SeedProject, SeedUnit } from './generate';
import { Rng } from './rng';
import { TYPE_SPECS } from './rules';

const FINISHING_TEXT: Record<Finishing, string> = {
  [Finishing.CORE_SHELL]: 'delivered core & shell, ready for your own design',
  [Finishing.SEMI_FINISHED]: 'semi-finished, so you choose the final touches',
  [Finishing.FULLY_FINISHED]: 'fully finished with modern fittings',
  [Finishing.FURNISHED]: 'fully furnished and ready to live in',
};

const VIEW_TEXT: Record<UnitView, string> = {
  [UnitView.SEA]: 'open sea views',
  [UnitView.POOL]: 'a view over the pool',
  [UnitView.GARDEN]: 'a green garden view',
  [UnitView.CITY]: 'a city skyline view',
  [UnitView.STREET]: 'a quiet street view',
};

const VIBE_TEXT: Record<AreaDef['vibe'], string[]> = {
  family: [
    'A calm, family-friendly community with schools and services close by.',
    'Ideal for families looking for space, greenery and a safe compound.',
  ],
  beach: [
    'A perfect summer home steps away from the beach.',
    'Made for weekends and holidays by the sea.',
  ],
  investment: [
    'A strong pick for investors, with solid rental demand in the area.',
    'Priced for buyers who want long-term value growth.',
  ],
  urban: [
    'Close to offices, malls and restaurants for an easy city lifestyle.',
    'A well-connected location in the heart of the city.',
  ],
};

export function describeUnit(
  rng: Rng,
  unit: Omit<SeedUnit, 'description'>,
  project: SeedProject,
  area: AreaDef
): string {
  const label = TYPE_SPECS[unit.propertyType].label.toLowerCase();
  const article = /^[aeiou]/.test(label) ? 'An' : 'A';
  const rooms =
    unit.propertyType === PropertyType.STUDIO
      ? 'an open-plan layout'
      : `${unit.rooms} bedrooms and ${unit.bathrooms} bathroom${unit.bathrooms > 1 ? 's' : ''}`;
  const location =
    unit.floor > 0 && TYPE_SPECS[unit.propertyType].apartmentLike
      ? ` on floor ${unit.floor}`
      : '';

  const intro = rng.pick([
    `${article} ${unit.floorArea} m² ${label} in ${project.name}, ${area.name}${location}.`,
    `Well-planned ${label} of ${unit.floorArea} m² in ${project.name} by ${project.developer}${location}.`,
    `${article} ${label} in ${project.name} (${area.name}), offering ${unit.floorArea} m²${location}.`,
  ]);
  const layout = `It has ${rooms}, with ${VIEW_TEXT[unit.view]}, and comes ${FINISHING_TEXT[unit.finishing]}.`;
  const delivery =
    unit.deliveryYear === null
      ? `Ready to move, with ${unit.downPaymentPct}% down${unit.installmentYears > 0 ? ` and the rest over ${unit.installmentYears} year${unit.installmentYears > 1 ? 's' : ''}` : ''}.`
      : `Delivery in ${unit.deliveryYear}, with ${unit.downPaymentPct === 0 ? 'no down payment' : `${unit.downPaymentPct}% down`} and installments over ${unit.installmentYears} years.`;
  const highlights = unit.amenities.filter((a) =>
    [
      'Beach Access',
      'Private Garden',
      'Swimming Pool',
      'Clubhouse',
      'Smart Home',
    ].includes(a)
  );
  const amenities =
    highlights.length > 0
      ? `Highlights: ${highlights.join(', ').toLowerCase()}.`
      : '';

  return [intro, layout, delivery, amenities, rng.pick(VIBE_TEXT[area.vibe])]
    .filter(Boolean)
    .join(' ');
}
