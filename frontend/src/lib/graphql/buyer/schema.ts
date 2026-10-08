import { z } from 'zod';
import { PROPERTY_TYPES } from './types';

const optionalNumber = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  z.coerce.number().min(0, { message: 'Must be 0 or more' }).nullable()
);

export const preferencesSchema = z
  .object({
    budgetMin: optionalNumber,
    budgetMax: optionalNumber,
    areas: z.array(z.string()),
    propertyTypes: z.array(z.enum(PROPERTY_TYPES)),
    minRooms: z.preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.number().int().min(0).nullable()
    ),
    minSize: optionalNumber,
    amenityIds: z.array(z.string().uuid()),
  })
  .refine(
    ({ budgetMin, budgetMax }) =>
      budgetMin == null || budgetMax == null || budgetMin <= budgetMax,
    { message: 'Max budget must be above min budget', path: ['budgetMax'] }
  );

export type PreferencesFormInput = z.input<typeof preferencesSchema>;
export type PreferencesInput = z.output<typeof preferencesSchema>;
