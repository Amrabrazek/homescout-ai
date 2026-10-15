import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_DISCOUNT_RATE,
  discountRateFrom,
  paymentPlanValue,
  planDiscountRate,
} from './payment-plan';

describe('paymentPlanValue', () => {
  it('discounts 10% down over 8 years at 20% to about 55% of the price', () => {
    const plan = paymentPlanValue(
      { price: 10_000_000, downPaymentPct: 10, installmentYears: 8 },
      0.2
    );
    expect(plan).toMatchObject({
      downPayment: 1_000_000,
      months: 96,
      monthlyInstallment: 93_750,
    });
    expect(plan.shareOfPrice).toBeCloseTo(0.547, 2);
    expect(plan.presentValue / 1e7).toBeCloseTo(plan.shareOfPrice, 3);
  });

  it('is worth the full price when paid in cash', () => {
    const plan = paymentPlanValue(
      { price: '5000000.00', downPaymentPct: '100.00', installmentYears: 0 },
      0.2
    );
    expect(plan.presentValue).toBe(5_000_000);
    expect(plan.shareOfPrice).toBe(1);
    expect(plan.monthlyInstallment).toBe(0);
  });

  it('equals the price at a zero rate', () => {
    const plan = paymentPlanValue(
      { price: 6_000_000, downPaymentPct: 5, installmentYears: 10 },
      0
    );
    expect(plan.presentValue).toBe(6_000_000);
  });

  it('returns null without plan data', () => {
    expect(paymentPlanValue({ price: 1_000_000 }, 0.2)).toBeNull();
    expect(
      paymentPlanValue(
        { price: 0, downPaymentPct: 10, installmentYears: 5 },
        0.2
      )
    ).toBeNull();
  });
});

describe('planDiscountRate', () => {
  it('is on by default and reads the rate', () => {
    expect(planDiscountRate(new ConfigService({}))).toBe(DEFAULT_DISCOUNT_RATE);
    expect(
      planDiscountRate(new ConfigService({ MARKET_DISCOUNT_RATE: '15' }))
    ).toBe(0.15);
  });

  it('is null when PLAN_VALUE_ENABLED=false', () => {
    expect(
      planDiscountRate(new ConfigService({ PLAN_VALUE_ENABLED: 'false' }))
    ).toBeNull();
  });
});

describe('discountRateFrom', () => {
  it.each([
    [undefined, DEFAULT_DISCOUNT_RATE],
    ['', DEFAULT_DISCOUNT_RATE],
    ['abc', DEFAULT_DISCOUNT_RATE],
    ['-1', DEFAULT_DISCOUNT_RATE],
    ['0.15', 0.15],
    ['18', 0.18],
    ['0', 0],
  ])('%p → %p', (raw, rate) => {
    expect(discountRateFrom(raw)).toBe(rate);
  });
});
