import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="container relative flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Built for agents & investors who close, not just list
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          The AI co-pilot for your next real estate deal
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Analyze cash flow and cap rate in seconds, score inbound leads automatically,
          and generate listing copy that sells — all in one place.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/signup">
              Start free — no card required
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/analyze">Try it without an account</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          3 free deal analyses every month. Upgrade whenever you're ready.
        </p>
      </div>
    </section>
  );
}
