import { CalendarClock, KeyRound, TrendingDown } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatters';
import type { Unit } from '@/lib/graphql/units/types';

type PlanFields = Pick<
  Unit,
  | 'price'
  | 'downPaymentPct'
  | 'installmentYears'
  | 'deliveryYear'
  | 'planValue'
>;

/** Monthly installment after the down payment, or null for cash units. */
export function monthlyInstallment(unit: PlanFields): number | null {
  const years = unit.installmentYears ?? 0;
  if (years === 0) return null;
  const price = Number(unit.price);
  const down = (price * Number(unit.downPaymentPct ?? 0)) / 100;
  return (price - down) / (years * 12);
}

export function PaymentPlan({ unit }: { unit: PlanFields }) {
  const price = Number(unit.price);
  const years = unit.installmentYears ?? 0;
  const downPct = Number(unit.downPaymentPct ?? 0);
  const delivery =
    unit.deliveryYear == null
      ? 'Ready to move'
      : `Delivery ${unit.deliveryYear}`;

  if (unit.downPaymentPct == null && unit.installmentYears == null) {
    return <Delivery label={delivery} />;
  }

  if (years === 0) {
    return (
      <div className='space-y-3'>
        <Row label='Payment' value='Cash, paid in full' />
        <Delivery label={delivery} />
      </div>
    );
  }

  const down = (price * downPct) / 100;
  const monthly = monthlyInstallment(unit) ?? 0;

  return (
    <div className='space-y-3'>
      <div className='flex items-baseline justify-between gap-3 rounded-xl bg-accent px-4 py-3'>
        <span className='text-sm font-semibold text-accent-foreground'>
          Monthly
        </span>
        <span className='text-xl font-extrabold tracking-tight text-accent-foreground tabular-nums'>
          {formatPrice(monthly)}
        </span>
      </div>
      <Row
        label={downPct === 0 ? 'Down payment' : `Down payment (${downPct}%)`}
        value={downPct === 0 ? 'None' : formatPrice(down)}
      />
      <Row
        label='Installments'
        value={`${years} years · ${years * 12} payments`}
      />
      <Delivery label={delivery} />
      {unit.planValue && <WorthToday value={unit.planValue} />}
    </div>
  );
}

function WorthToday({ value }: { value: NonNullable<Unit['planValue']> }) {
  const share = Math.round(value.shareOfPrice * 100);
  const rate = Math.round(value.discountRate * 100);
  return (
    <div className='rounded-xl border border-dashed px-4 py-3'>
      <div className='flex items-baseline justify-between gap-3'>
        <span className='flex items-center gap-2 text-sm text-muted-foreground'>
          <TrendingDown className='h-4 w-4' />
          Worth today
        </span>
        <span className='font-semibold tabular-nums'>
          {formatPrice(value.presentValue)}
        </span>
      </div>
      <p className='mt-1 text-xs text-muted-foreground'>
        Paying over time costs {share}% of the price in today&apos;s money,
        if your cash could earn {rate}% a year elsewhere.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 text-sm'>
      <span className='flex items-center gap-2 text-muted-foreground'>
        <CalendarClock className='h-4 w-4' />
        {label}
      </span>
      <span className='font-semibold tabular-nums'>{value}</span>
    </div>
  );
}

function Delivery({ label }: { label: string }) {
  return (
    <div className='flex items-center justify-between gap-3 text-sm'>
      <span className='flex items-center gap-2 text-muted-foreground'>
        <KeyRound className='h-4 w-4' />
        Handover
      </span>
      <span className='font-semibold'>{label}</span>
    </div>
  );
}
