'use client';

import Link from 'next/link';
import { Loader2, Settings2 } from 'lucide-react';
import pathsConfig from '@/config/paths.config';
import type { ConciergeMessage } from '@/lib/concierge/tools';
import { ChatUnitCard } from './ChatUnitCard';
import { formatEgp, propertyTypeLabel } from './format';

type Part = ConciergeMessage['parts'][number];
type ToolPart = Extract<Part, { type: `tool-${string}` }>;

const PENDING: Record<string, string> = {
  'tool-search_units': 'Searching units…',
  'tool-get_unit': 'Looking up the unit…',
  'tool-compare_units': 'Comparing units…',
  'tool-find_similar': 'Finding similar units…',
  'tool-get_preferences': 'Checking your preferences…',
  'tool-update_preferences': 'Updating your preferences…',
  'tool-save_unit': 'Saving…',
};

export function isToolPart(part: Part): part is ToolPart {
  return part.type.startsWith('tool-');
}

/** Renders a tool call's result. Units shown here come only from tool output. */
export function ToolResult({ part }: { part: ToolPart }) {
  if (part.state === 'output-error') {
    return (
      <p className='text-xs text-destructive'>
        {PENDING[part.type]?.replace('…', '') ?? 'A step'} failed.
      </p>
    );
  }
  if (part.state !== 'output-available') {
    return (
      <p className='flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='h-3 w-3 animate-spin' />
        {PENDING[part.type] ?? 'Working…'}
      </p>
    );
  }

  switch (part.type) {
    case 'tool-search_units':
      return (
        <div className='space-y-2'>
          <p className='text-xs text-muted-foreground'>
            {part.output.total === 0
              ? 'No units match.'
              : `Showing ${part.output.units.length} of ${part.output.total} matching units`}
          </p>
          {part.output.units.map((unit) => (
            <ChatUnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      );
    case 'tool-get_unit':
      return <ChatUnitCard unit={part.output} />;
    case 'tool-find_similar':
      return (
        <div className='space-y-2'>
          {part.output.map(({ unit, reasons }) => (
            <ChatUnitCard key={unit.id} unit={unit} reasons={reasons} />
          ))}
        </div>
      );
    case 'tool-compare_units':
      return <Comparison units={part.output} />;
    case 'tool-update_preferences':
      return (
        <Link
          href={pathsConfig.home.preferences}
          className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20'
        >
          <Settings2 className='h-3 w-3' />
          Preferences updated
        </Link>
      );
    case 'tool-save_unit':
      return (
        <p className='text-xs text-emerald-700'>
          Saved to{' '}
          <Link href={pathsConfig.home.preferences} className='underline'>
            your list
          </Link>
          .
        </p>
      );
    default:
      return null;
  }
}

type Detail = Extract<
  ToolPart,
  { type: 'tool-compare_units'; state: 'output-available' }
>['output'][number];

function planLabel(plan: Detail['paymentPlan'] | undefined): string {
  if (!plan) return '–';
  if (plan.months === 0) return 'Cash';
  return `${plan.downPaymentPct}% down, ${plan.installmentYears} yrs`;
}

function worthToday(plan: Detail['paymentPlan'] | undefined): string {
  if (!plan) return '–';
  return `${formatEgp(plan.presentValue)} (${Math.round(plan.shareOfPrice * 100)}%)`;
}

function Comparison({ units }: { units: Detail[] }) {
  const rows: [string, (u: Detail) => string][] = [
    ['Price', (u) => formatEgp(u.price)],
    ['Area', (u) => u.area ?? '–'],
    [
      'Type',
      (u) => (u.propertyType ? propertyTypeLabel(u.propertyType) : '–'),
    ],
    ['Bedrooms', (u) => String(u.rooms)],
    ['Size', (u) => `${u.floorArea} m²`],
    ['Price / m²', (u) => formatEgp(Math.round(u.price / u.floorArea))],
    ['Delivery', (u) => (u.deliveryYear ? String(u.deliveryYear) : 'Ready')],
    ['Plan', (u) => planLabel(u.paymentPlan)],
    ['Worth today', (u) => worthToday(u.paymentPlan)],
    ['Finishing', (u) => u.finishing?.replace(/_/g, ' ') ?? '–'],
    ['Amenities', (u) => u.amenities.join(', ') || '–'],
  ];
  return (
    <div className='overflow-x-auto rounded-lg border bg-white'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b'>
            <th />
            {units.map((u) => (
              <th key={u.id} className='p-2 text-left font-medium'>
                <Link
                  href={pathsConfig.units.detail.replace('[id]', u.id)}
                  className='hover:underline'
                >
                  {u.name}
                </Link>
                <div className='font-normal text-muted-foreground'>
                  {u.project}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className='border-b last:border-0'>
              <td className='p-2 text-muted-foreground'>{label}</td>
              {units.map((u) => (
                <td key={u.id} className='p-2 align-top'>
                  {value(u)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
