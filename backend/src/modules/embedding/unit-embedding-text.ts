import { createHash } from 'crypto';
import { Unit } from '../../common/entities/unit.entity';

const humanize = (value: string) => value.replace(/_/g, ' ');

export function buildUnitEmbeddingText(unit: Unit): string {
  const project = unit.project;
  const location = [project?.area, project?.city, project?.region]
    .filter(Boolean)
    .join(', ');
  const amenities = (unit.amenities ?? [])
    .map((a) => a.name)
    .sort()
    .join(', ');

  return [
    unit.name,
    unit.propertyType && `Type: ${humanize(unit.propertyType)}`,
    project && `Project: ${project.name}`,
    project?.developer && `Developer: ${project.developer.name}`,
    location && `Location: ${location}`,
    `${unit.rooms} bedrooms, ${unit.bathrooms} bathrooms, ${Number(unit.floorArea)} m², floor ${unit.floor}`,
    `Price: ${Number(unit.price)} EGP`,
    unit.finishing && `Finishing: ${humanize(unit.finishing)}`,
    unit.view && `View: ${unit.view}`,
    unit.deliveryYear ? `Delivery: ${unit.deliveryYear}` : 'Ready to move',
    amenities && `Amenities: ${amenities}`,
    unit.description,
  ]
    .filter(Boolean)
    .join('\n');
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
