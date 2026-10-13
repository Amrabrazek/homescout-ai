export const DEFAULT_DISCOUNT_RATE = 0.2;

export interface PlanFields {
  price: number | string;
  downPaymentPct?: number | string | null;
  installmentYears?: number | null;
}

export interface PlanValue {
  downPayment: number;
  months: number;
  monthlyInstallment: number;
  /** What the plan's payments are worth in today's money. */
  presentValue: number;
  /** presentValue / price, 0..1. */
  shareOfPrice: number;
  /** Yearly rate the installments were discounted at, e.g. 0.2. */
  discountRate: number;
}

/** MARKET_DISCOUNT_RATE as a fraction ("0.2" or "20" both mean 20%). */
export function discountRateFrom(raw?: string | number | null): number {
  const rate = Number(raw);
  if (raw == null || raw === '' || !Number.isFinite(rate) || rate < 0) {
    return DEFAULT_DISCOUNT_RATE;
  }
  return rate >= 1 ? rate / 100 : rate;
}

/**
 * Down payment now, then equal monthly installments starting a month later,
 * each discounted at the monthly rate. Null when the unit has no plan data.
 */
export function paymentPlanValue(
  unit: PlanFields,
  annualRate: number
): PlanValue | null {
  if (unit.downPaymentPct == null && unit.installmentYears == null) {
    return null;
  }
  const price = Number(unit.price);
  if (!(price > 0)) return null;

  const downPayment = (price * Number(unit.downPaymentPct ?? 0)) / 100;
  const months = Math.max(0, Math.round((unit.installmentYears ?? 0) * 12));
  const monthlyInstallment = months ? (price - downPayment) / months : 0;
  const r = annualRate / 12;
  const annuityFactor =
    months === 0 ? 0 : r === 0 ? months : (1 - (1 + r) ** -months) / r;
  const presentValue =
    months === 0 ? price : downPayment + monthlyInstallment * annuityFactor;

  return {
    downPayment: Math.round(downPayment),
    months,
    monthlyInstallment: Math.round(monthlyInstallment),
    presentValue: Math.round(presentValue),
    shareOfPrice: Math.round((presentValue / price) * 1000) / 1000,
    discountRate: annualRate,
  };
}
