// Deterministic rental underwriting — no AI, no network, no API key.
//
// This powers the public /analyze page, which anyone can use without an
// account. Keeping it as pure arithmetic is deliberate: an unauthenticated
// endpoint that reached the Anthropic API would be an open cost-abuse vector.
// The AI summary, red flags, and saved history stay behind the login wall,
// where they are metered per plan.
//
// Assumptions match those documented in the analyze-deal edge function's
// system prompt, so the free number is consistent with the paid one.

/** Share of gross rent consumed by taxes, insurance, maintenance, vacancy, and management. */
const OPERATING_EXPENSE_RATIO = 0.47;
const DOWN_PAYMENT_RATIO = 0.25;
const ANNUAL_INTEREST_RATE = 0.07;
const LOAN_TERM_YEARS = 30;

/** Rough national-average rent-to-price ratio, used only when rent is unknown. */
const FALLBACK_MONTHLY_RENT_RATIO = 0.007;

export type UnderwritingInput = {
  price: number;
  /** Monthly rent. Omit or pass 0 to fall back to a rough estimate from price. */
  monthlyRent?: number;
};

export type UnderwritingResult = {
  monthlyRent: number;
  rentWasEstimated: boolean;
  netOperatingIncome: number;
  capRate: number;
  monthlyMortgage: number;
  monthlyCashFlow: number;
  basicScore: number;
};

/** Standard amortizing payment. Falls back to straight division at 0% interest. */
function monthlyMortgagePayment(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 12;
  const payments = years * 12;
  if (monthlyRate === 0) return principal / payments;
  const growth = Math.pow(1 + monthlyRate, payments);
  return (principal * monthlyRate * growth) / (growth - 1);
}

/**
 * Blends cap rate and cash flow into a 1-100 score. Cap rate carries most of
 * the weight; cash flow acts as a bonus so a break-even deal is not penalised
 * as hard as one that bleeds every month.
 */
function scoreDeal(capRate: number, monthlyCashFlow: number) {
  // 4% cap rate scores ~35, 8% scores ~75, 10%+ tops out.
  const capComponent = Math.min(Math.max((capRate - 2) * 11, 0), 78);
  // ±$400/mo moves the score by up to 22 points.
  const cashComponent = Math.min(Math.max(monthlyCashFlow / 400, -1), 1) * 22;
  return Math.round(Math.min(Math.max(capComponent + cashComponent, 1), 100));
}

export function basicUnderwriting({ price, monthlyRent }: UnderwritingInput): UnderwritingResult {
  const rentWasEstimated = !monthlyRent || monthlyRent <= 0;
  const effectiveRent = rentWasEstimated ? price * FALLBACK_MONTHLY_RENT_RATIO : monthlyRent!;

  const annualGrossRent = effectiveRent * 12;
  const netOperatingIncome = annualGrossRent * (1 - OPERATING_EXPENSE_RATIO);
  const capRate = price > 0 ? (netOperatingIncome / price) * 100 : 0;

  const loanAmount = price * (1 - DOWN_PAYMENT_RATIO);
  const monthlyMortgage = monthlyMortgagePayment(loanAmount, ANNUAL_INTEREST_RATE, LOAN_TERM_YEARS);
  const monthlyCashFlow = netOperatingIncome / 12 - monthlyMortgage;

  return {
    monthlyRent: Math.round(effectiveRent),
    rentWasEstimated,
    netOperatingIncome: Math.round(netOperatingIncome),
    capRate: Number(capRate.toFixed(2)),
    monthlyMortgage: Math.round(monthlyMortgage),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    basicScore: scoreDeal(capRate, monthlyCashFlow),
  };
}
