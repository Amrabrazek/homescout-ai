import type { BuyerProfile } from '@/lib/graphql/buyer/types';
import type { Unit } from '@/lib/graphql/units/types';
import { formatPriceShort } from '@/lib/utils/formatters';

export type FitCheck = { label: string; met: boolean };

export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

/**
 * Compares a unit with the buyer's stated preferences. Only preferences the
 * buyer actually set produce a line, so an empty profile returns [].
 */
export function fitChecks(profile: BuyerProfile, unit: Unit): FitCheck[] {
  const checks: FitCheck[] = [];
  const price = Number(unit.price);
  const { budgetMin, budgetMax } = profile;

  if (budgetMax != null && price > budgetMax) {
    const over = Math.round(((price - budgetMax) / budgetMax) * 100);
    checks.push({
      label: `${over > 0 ? `${over}%` : 'Slightly'} over your ${formatPriceShort(budgetMax)} budget`,
      met: false,
    });
  } else if (budgetMin != null && price < budgetMin) {
    checks.push({
      label: `Below your ${formatPriceShort(budgetMin)} minimum`,
      met: false,
    });
  } else if (budgetMin != null || budgetMax != null) {
    checks.push({ label: 'Within your budget', met: true });
  }

  const area = unit.project.area;
  if (profile.areas.length > 0) {
    const met = !!area && profile.areas.includes(area);
    checks.push({
      label: met
        ? `In ${area}, one of your areas`
        : `${area ?? 'This area'} isn't one of your areas`,
      met,
    });
  }

  if (profile.propertyTypes.length > 0 && unit.propertyType) {
    const met = profile.propertyTypes.includes(unit.propertyType);
    const type = humanize(unit.propertyType).toLowerCase();
    const a = /^[aeiou]/.test(type) ? 'An' : 'A';
    checks.push({
      label: met
        ? `${a} ${type}, as you wanted`
        : `${a} ${type}, not your type`,
      met,
    });
  }

  if (profile.minRooms != null) {
    const met = unit.rooms >= profile.minRooms;
    checks.push({
      label: met
        ? `${unit.rooms} bedrooms (you want ${profile.minRooms}+)`
        : `Only ${unit.rooms} bedrooms (you want ${profile.minRooms}+)`,
      met,
    });
  }

  if (profile.minSize != null) {
    const size = Math.round(Number(unit.floorArea));
    const met = size >= profile.minSize;
    checks.push({
      label: met
        ? `${size} m² (you want ${profile.minSize}+)`
        : `${size} m², under your ${profile.minSize} m²`,
      met,
    });
  }

  if (profile.amenityIds.length > 0) {
    const has = unit.amenities.filter((a) => profile.amenityIds.includes(a.id));
    const total = profile.amenityIds.length;
    checks.push({
      label:
        has.length === 0
          ? 'None of your must-have amenities'
          : `${has.length === total ? 'All' : `${has.length} of ${total}`} must-haves: ${has.map((a) => a.name).join(', ')}`,
      met: has.length === total,
    });
  }

  return checks;
}
