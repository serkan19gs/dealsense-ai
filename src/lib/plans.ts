export type PlanId = "free" | "pro" | "team";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  priceSuffix: string;
  description: string;
  seats: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  stripePriceEnvVar?: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceSuffix: "/mo",
    description: "Try DealSense on your next deal, no card required.",
    seats: "1 seat",
    features: [
      "3 AI deal analyses / month",
      "5 AI listing descriptions / month",
      "10 lead scores / month",
      "Deal pipeline board",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    priceSuffix: "/mo",
    description: "For active agents and investors closing deals every month.",
    seats: "1 seat",
    features: [
      "Unlimited AI deal analyses",
      "200 AI listing descriptions / month",
      "Unlimited lead scoring & prioritization",
      "AI comp reports",
      "Priority support",
    ],
    cta: "Start Pro trial",
    highlighted: true,
    stripePriceEnvVar: "VITE_STRIPE_PRICE_PRO",
  },
  {
    id: "team",
    name: "Team / Brokerage",
    price: 199,
    priceSuffix: "/mo",
    description: "Share a pipeline and market intelligence across your team.",
    seats: "Up to 10 seats",
    features: [
      "Everything in Pro",
      "Shared deal pipeline",
      "Weekly AI market pulse reports",
      "Team performance analytics",
      "Dedicated onboarding",
    ],
    cta: "Start Team plan",
    stripePriceEnvVar: "VITE_STRIPE_PRICE_TEAM",
  },
];
