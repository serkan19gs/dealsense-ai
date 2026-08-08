export type PlanTier = "free" | "pro" | "team";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  brokerage: string | null;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  tier: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seats: number;
  current_period_end: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  user_id: string;
  address: string;
  stage: "new" | "analyzing" | "under_contract" | "closed" | "lost";
  price: number | null;
  investment_score: number | null;
  ai_summary: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lead_score: number | null;
  lead_type: "buyer" | "seller" | "renter" | "investor";
  created_at: string;
};

export type Analysis = {
  id: string;
  user_id: string;
  kind: "deal_analysis" | "listing_copy" | "lead_score" | "market_pulse";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  user_id: string | null;
  name: string;
  properties: Record<string, unknown>;
  created_at: string;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ProfileInsert = Optional<Profile, "full_name" | "brokerage" | "created_at">;
export type DealInsert = Optional<Deal, "id" | "stage" | "price" | "investment_score" | "ai_summary" | "created_at">;
export type LeadInsert = Optional<
  Lead,
  "id" | "email" | "phone" | "notes" | "lead_score" | "lead_type" | "created_at"
>;
export type AnalysisInsert = Optional<Analysis, "id" | "created_at">;
export type AnalyticsEventInsert = Optional<AnalyticsEvent, "id" | "user_id" | "properties" | "created_at">;
