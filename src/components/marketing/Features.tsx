import { Calculator, FileText, Users, Kanban, TrendingUp, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Calculator,
    title: "AI Deal Analyzer",
    description:
      "Drop in an address and price and get cash flow, cap rate, rent estimate, and a 1–100 investment score in seconds.",
  },
  {
    icon: FileText,
    title: "AI Listing Copywriter",
    description:
      "Turn a few bullet points into MLS-ready listing descriptions in the tone your market responds to.",
  },
  {
    icon: Users,
    title: "Lead Scoring",
    description:
      "AI reads inbound inquiries and notes to score urgency and intent, so you always follow up with the hottest lead first.",
  },
  {
    icon: Kanban,
    title: "Deal Pipeline",
    description:
      "A lightweight CRM board to track every deal from new lead to closing, without the enterprise CRM bloat.",
  },
  {
    icon: TrendingUp,
    title: "AI Market Pulse",
    description:
      "Weekly AI-generated market summaries by zip code — a client-ready talking point, automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Built for teams",
    description:
      "Share pipelines and reports across your brokerage with seat-based team plans.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to move faster than the next agent
          </h2>
          <p className="mt-4 text-muted-foreground">
            DealSense replaces the spreadsheet, the notes app, and the copy-paste listing draft with one AI workflow.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
