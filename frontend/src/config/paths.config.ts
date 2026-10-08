import { z } from 'zod';

const PathsSchema = z.object({
  home: z.object({
    index: z.string().min(1),
    preferences: z.string().min(1),
  }),
  units: z.object({
    detail: z.string().min(1),
    new: z.string().min(1),
    edit: z.string().min(1),
    listing: z.string().min(1),
  }),
  projects: z.object({
    index: z.string().min(1),
    detail: z.string().min(1),
    new: z.string().min(1),
    edit: z.string().min(1),
    listing: z.string().min(1),
  }),
  developers: z.object({
    index: z.string().min(1),
    detail: z.string().min(1),
    listing: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  home: {
    index: '/',
    preferences: '/preferences',
  },
  units: {
    detail: '/unit/[id]',
    listing: '/dashboard/units',
    new: '/dashboard/units/new',
    edit: '/dashboard/units/[id]',
  },
  projects: {
    index: '/projects',
    listing: '/dashboard/projects',
    detail: '/projects/[id]',
    new: '/dashboard/projects/new',
    edit: '/dashboard/projects/[id]',
  },
  developers: {
    index: '/developers',
    listing: '/dashboard/developers',
    detail: '/developers/[id]',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;

// Helper function to generate paths with parameters
export function createPath(
  path: string,
  params: Record<string, string>
): string {
  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`[${key}]`, value);
  });
  return result;
}

// Example usage:
// createPath(pathsConfig.units.detail, { id: '123' }) => '/unit/123'
