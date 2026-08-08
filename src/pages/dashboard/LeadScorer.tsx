import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { scoreLead, type LeadScoreResult } from "@/lib/ai";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/track";

const LEAD_TYPES = ["buyer", "seller", "renter", "investor"] as const;
const URGENCY_VARIANT: Record<LeadScoreResult["urgency"], "default" | "secondary" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export default function LeadScorer() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [leadType, setLeadType] = useState<(typeof LEAD_TYPES)[number]>("buyer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadScoreResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const score = await scoreLead({ name, notes, leadType });
      setResult(score);
      if (user) {
        await supabase.from("leads").insert({
          user_id: user.id,
          name,
          notes,
          lead_type: leadType,
          lead_score: score.score,
        });
        await supabase.from("analyses").insert({
          user_id: user.id,
          kind: "lead_score",
          input: { name, notes, leadType },
          output: score,
        });
      }
      await track("lead_scored", { leadType });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lead Scorer</h1>
        <p className="text-muted-foreground">Paste an inquiry or call notes and get a priority score.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Lead type</Label>
                <Select value={leadType} onValueChange={(v) => setLeadType(v as typeof leadType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Inquiry / call notes</Label>
                <Textarea
                  id="notes"
                  rows={6}
                  placeholder="Looking to move within 60 days, pre-approved for $600k, has a house to sell first..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Scoring…" : "Score lead"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && <p className="text-sm text-muted-foreground">No lead scored yet.</p>}
            {loading && <p className="text-sm text-muted-foreground">Reading the notes…</p>}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-primary">{result.score}</span>
                  <Badge variant={URGENCY_VARIANT[result.urgency]} className="capitalize">
                    {result.urgency} urgency
                  </Badge>
                </div>
                <p className="text-sm">{result.reasoning}</p>
                <div className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
                  <span className="font-medium">Next step: </span>
                  {result.suggestedNextStep}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
