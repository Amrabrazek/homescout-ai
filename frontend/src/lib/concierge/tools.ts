import { tool, type InferUITools, type ToolSet, type UIMessage } from 'ai';
import { z } from 'zod/v4';
import type { InternalApi } from './api';
import {
  PROPERTY_TYPES,
  type BuyerFact,
  type BuyerPreferences,
  type SimilarUnit,
  type UnitCard,
  type UnitDetail,
  type UnitSearchResult,
} from './types';

const unitId = z.string().uuid().describe('A unit ID from an earlier result');
const propertyTypes = z.array(z.enum(PROPERTY_TYPES));
const locations = z
  .array(z.string())
  .describe(
    'Areas, cities or regions as the buyer said them, e.g. ["New Cairo", "Zayed"]. Partial names match every area containing them.'
  );
const amenities = z
  .array(z.string())
  .describe('Amenity names, e.g. ["Schools Nearby", "pool", "gym"]');

/** Images are for the chat cards; the model doesn't need them. */
const forModel = ({ imageUrl: _, ...unit }: UnitCard) => unit;

export function conciergeTools(api: InternalApi) {
  return {
    search_units: tool({
      description:
        'Search real units. Every filter is a hard constraint. Put soft wishes (e.g. "family", "quiet", "sea view") in query. The result lists appliedFilters (what every unit meets) and unmatched names that were ignored.',
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe('Free-text wishes for keyword + semantic matching'),
        locations: locations.optional(),
        propertyTypes: propertyTypes.optional(),
        minRooms: z.number().int().min(0).optional(),
        maxRooms: z.number().int().min(0).optional(),
        minPrice: z.number().min(0).optional().describe('EGP'),
        maxPrice: z.number().min(0).optional().describe('EGP'),
        minFloorArea: z.number().min(0).optional().describe('m²'),
        maxFloorArea: z.number().min(0).optional().describe('m²'),
        amenities: amenities.optional(),
        limit: z.number().int().min(1).max(12).optional().describe('Default 6'),
      }),
      execute: (input) =>
        api<UnitSearchResult>('POST', '/units/search', input),
      toModelOutput: ({ output }) => ({
        type: 'json',
        value: { ...output, units: output.units.map(forModel) } as any,
      }),
    }),

    get_unit: tool({
      description:
        'Full details of one unit: amenities, finishing, view, floor, description, payment plan and its value today.',
      inputSchema: z.object({ id: unitId }),
      execute: ({ id }) => api<UnitDetail>('GET', `/units/${id}`),
      toModelOutput: ({ output }) => ({
        type: 'json',
        value: forModel(output) as any,
      }),
    }),

    compare_units: tool({
      description: 'Side-by-side details of 2 to 6 units. Put every unit the buyer wants compared in one call.',
      inputSchema: z.object({ ids: z.array(unitId).min(2).max(6) }),
      execute: ({ ids }) =>
        api<UnitDetail[]>('POST', '/units/compare', { ids }),
      toModelOutput: ({ output }) => ({
        type: 'json',
        value: output.map(forModel) as any,
      }),
    }),

    find_similar: tool({
      description:
        'Units similar to one unit (same type, region and price band first), each with reasons.',
      inputSchema: z.object({
        id: unitId,
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: ({ id, limit }) =>
        api<SimilarUnit[]>(
          'GET',
          `/units/${id}/similar${limit ? `?limit=${limit}` : ''}`
        ),
      toModelOutput: ({ output }) => ({
        type: 'json',
        value: output.map((s) => ({ ...s, unit: forModel(s.unit) })) as any,
      }),
    }),

    get_preferences: tool({
      description:
        "The buyer's saved preferences (budget, areas, types, rooms, size, amenities) and saved unit IDs.",
      inputSchema: z.object({}),
      execute: () => api<BuyerPreferences>('GET', '/preferences'),
    }),

    update_preferences: tool({
      description:
        'Save what the buyer told you about their needs so it shows on their "My preferences" page. Send only fields they stated. Lists replace the stored list, so include earlier values to keep them. Send null to clear a value.',
      inputSchema: z.object({
        budgetMin: z.number().min(0).nullable().optional().describe('EGP'),
        budgetMax: z.number().min(0).nullable().optional().describe('EGP'),
        locations: locations.optional(),
        propertyTypes: propertyTypes.optional(),
        minRooms: z.number().int().min(0).nullable().optional(),
        minSize: z.number().min(0).nullable().optional().describe('m²'),
        amenities: amenities.optional(),
      }),
      execute: (input) =>
        api<BuyerPreferences>('PATCH', '/preferences', input),
    }),

    remember_fact: tool({
      description:
        'Remember something the buyer said about their life or needs that no preference field holds (household, work, lifestyle), so later chats know it. One short third-person sentence, e.g. "Has two kids".',
      inputSchema: z.object({ text: z.string().min(1).max(200) }),
      execute: ({ text }) => api<BuyerFact>('POST', '/facts', { text }),
    }),

    forget_fact: tool({
      description:
        'Delete a remembered fact by its id from "About this buyer", when it is wrong, outdated or the buyer asks you to forget it.',
      inputSchema: z.object({ id: z.string().describe('A fact id') }),
      execute: async ({ id }) => {
        await api<void>('DELETE', `/facts/${encodeURIComponent(id)}`);
        return { forgotten: true, id };
      },
    }),

    save_unit: tool({
      description:
        "Add a unit to the buyer's saved list. Only when the buyer asks to save it.",
      inputSchema: z.object({ id: unitId }),
      execute: async ({ id }) => {
        await api<void>('POST', `/units/${id}/save`);
        return { saved: true, id };
      },
    }),
  } satisfies ToolSet;
}

export type ConciergeTools = ReturnType<typeof conciergeTools>;
export type ConciergeMessage = UIMessage<
  never,
  never,
  InferUITools<ConciergeTools>
>;
