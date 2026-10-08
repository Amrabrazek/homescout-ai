import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asBuyer } from '@/lib/graphql/buyer/server';
import { RECORD_BUYER_EVENT } from '@/lib/graphql/buyer/queries';
import { BUYER_EVENT_TYPES } from '@/lib/graphql/buyer/types';

const eventSchema = z.object({
  unitId: z.string().uuid(),
  type: z.enum(BUYER_EVENT_TYPES),
});

/** Records that the current buyer viewed, saved or skipped a unit. */
export async function POST(request: NextRequest) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  try {
    await asBuyer(
      { mutation: RECORD_BUYER_EVENT },
      { unitId: parsed.data.unitId, type: parsed.data.type.toUpperCase() }
    );
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record event' },
      { status: 502 }
    );
  }
}
