import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { analyzeDeal, type DealAnalysisResult } from "@/lib/ai";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/track";

export default function DealAnalyzer() {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [estimatedRent, setEstimatedRent] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DealAnalysisResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeDeal({
        address,
        price: Number(price),
        estimatedRent: estimatedRent ? Number(estimatedRent) : undefined,
        notes,
      });
      setResult(analysis);

      if (user) {
        await supabase.from("deals").insert({
          user_id: user.id,
          address,
          price: Number(price),
          investment_score: analysis.investmentScore,
          ai_summary: analysis.summary,
          stage: "analyzing",
        });
        await supabase.from("analyses").insert({
          user_id: user.id,
          kind: "deal_analysis",
          input: { address, price: Number(price), estimatedRent, notes },
          output: analysis,
        });
      }
      await track("deal_analysis_run", { address });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Deal Analyzer</h1>
        <p className="text-muted-foreground">
          Enter the basics and get an instant investment score with cash flow and cap rate.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property details</CardTitle>
            <CardDescription>The more detail you give, the sharper the analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">List price ($)</Label>
                  <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rent">Est. monthly rent ($)</Label>
                  <Input
                    id="rent"
                    type="number"
                    value={estimatedRent}
                    onChange={(e) => setEstimatedRent(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (condition, comps, anything AI should know)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Analyzing…" : "Analyze deal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis</CardTitle>
            <CardDescription>Results appear here once you run an analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <p className="text-sm text-muted-foreground">No analysis yet.</p>
            )}
            {loading && <p className="text-sm text-muted-foreground">Crunching the numbers…</p>}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-primary">{result.investmentScore}</span>
                  <div>
                    <p className="text-sm font-medium">Investment score</p>
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
                    <p className="font-semibold">${result.monthlyCashFlow.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estimated rent</p>
                    <p className="font-semibold">${result.estimatedRent.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm">{result.summary}</p>
                {result.redFlags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Watch out for</p>
                    <div className="flex flex-wrap gap-2">
                      {result.redFlags.map((flag) => (
                        <Badge key={flag} variant="destructive">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
