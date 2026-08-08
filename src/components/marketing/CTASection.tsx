import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="border-t py-24">
      <div className="container flex flex-col items-center rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Analyze your next deal in the next 60 seconds
        </h2>
        <p className="mt-4 max-w-xl text-primary-foreground/80">
          Join agents and investors using DealSense to move faster on every offer.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8">
          <Link to="/signup">Start free</Link>
        </Button>
      </div>
    </section>
  );
}
