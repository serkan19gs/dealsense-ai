import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { basicUnderwriting, type UnderwritingResult } from "@/lib/underwriting";

export default function QuickAnalyze() {
  const [price, setPrice] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [result, setResult] = useState<UnderwritingResult | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPrice = Number(price);
    if (!parsedPrice || parsedPrice <= 0) return;
    setResult(
      basicUnderwriting({
        price: parsedPrice,
        monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
      })
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container max-w-5xl py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Free — no account needed
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Is this rental actually a good deal?
            </h1>
            <p className="mt-4 text-muted-foreground">
              Enter a price and rent to get the cap rate, monthly cash flow, and a deal score in
              seconds. Nothing to install, nothing to sign up for.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">The numbers</CardTitle>
                <CardDescription>
                  Leave rent blank and we'll estimate it from the price.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Purchase price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="1"
                      placeholder="300000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rent">Expected monthly rent ($)</Label>
                    <Input
                      id="rent"
                      type="number"
                      min="0"
                      placeholder="Optional"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Analyze this deal
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Assumes 25% down, 7% over 30 years, and operating expenses at 47% of gross rent.
                  </p>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your result</CardTitle>
                  <CardDescription>
                    {result ? "Based on standard underwriting assumptions." : "Run an analysis to see it here."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!result && <p className="text-sm text-muted-foreground">Nothing analyzed yet.</p>}
                  {result && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold text-primary">{result.basicScore}</span>
                        <div>
                          <p className="text-sm font-medium">Deal score</p>
                          <p className="text-xs text-muted-foreground">out of 100</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cap rate</p>
                          <p className="font-semibold">{result.capRate.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Monthly cash flow</p>
                          <p
                            className={
                              result.monthlyCashFlow >= 0
                                ? "font-semibold text-primary"
                                : "font-semibold text-destructive"
                            }
                          >
                            ${result.monthlyCashFlow.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Monthly rent{result.rentWasEstimated && " (estimated)"}
                          </p>
                          <p className="font-semibold">${result.monthlyRent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Mortgage payment</p>
                          <p className="font-semibold">${result.monthlyMortgage.toLocaleString()}</p>
                        </div>
                      </div>
                      {result.rentWasEstimated && (
                        <p className="text-xs text-muted-foreground">
                          Rent was estimated from the purchase price. Enter a real figure for a
                          sharper result.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {result && (
                <Card className="border-primary ring-1 ring-primary">
                  <CardHeader>
                    <Badge className="mb-2 w-fit">
                      <Lock className="mr-1 h-3 w-3" />
                      Free account
                    </Badge>
                    <CardTitle className="text-lg">Want the AI read on this deal?</CardTitle>
                    <CardDescription>
                      A free account adds the AI summary explaining <em>why</em> this scores the way
                      it does, the red flags to watch for, a sharper rent estimate, and saves the
                      deal to your pipeline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to="/signup">Get the full analysis — free</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
