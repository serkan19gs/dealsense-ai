import { supabase } from "@/lib/supabaseClient";

export type DealAnalysisResult = {
  investmentScore: number;
  estimatedRent: number;
  capRate: number;
  monthlyCashFlow: number;
  summary: string;
  redFlags: string[];
};

export type ListingCopyResult = {
  headline: string;
  description: string;
};

export type LeadScoreResult = {
  score: number;
  urgency: "low" | "medium" | "high";
  reasoning: string;
  suggestedNextStep: string;
};

async function invoke<TResult>(fn: string, body: Record<string, unknown>): Promise<TResult> {
  const { data, error } = await supabase.functions.invoke<TResult>(fn, { body });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No response from AI service.");
  return data;
}

export function analyzeDeal(input: {
  address: string;
  price: number;
  estimatedRent?: number;
  notes?: string;
}) {
  return invoke<DealAnalysisResult>("analyze-deal", input);
}

export function generateListingCopy(input: {
  address: string;
  bullets: string;
  tone: "professional" | "warm" | "luxury" | "concise";
}) {
  return invoke<ListingCopyResult>("generate-listing", input);
}

export function scoreLead(input: { name: string; notes: string; leadType: string }) {
  return invoke<LeadScoreResult>("score-lead", input);
}
