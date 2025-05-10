import { z } from 'zod';

export const unitSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  number: z.string().min(1, { message: 'Number is required' }),
  floor: z.coerce
    .number()
    .int()
    .min(0, { message: 'Floor must be a positive number' }),
  rooms: z.coerce
    .number()
    .int()
    .positive({ message: 'Rooms must be a positive number' }),
  bathrooms: z.coerce
    .number()
    .int()
    .positive({ message: 'Bathrooms must be a positive number' }),
  floorArea: z.coerce
    .number()
    .positive({ message: 'Floor area must be a positive number' }),
  price: z.coerce
    .number()
    .positive({ message: 'Price must be a positive number' }),
  description: z.string().optional(),
  projectId: z.string().uuid({ message: 'Project is required' }),
  amenityIds: z.array(z.string()).default([]),
  imageIds: z.array(z.string()).default([]),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
