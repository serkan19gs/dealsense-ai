import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Deal } from "@/types/database";

const STAGES: { id: Deal["stage"]; label: string }[] = [
  { id: "new", label: "New" },
  { id: "analyzing", label: "Analyzing" },
  { id: "under_contract", label: "Under contract" },
  { id: "closed", label: "Closed" },
  { id: "lost", label: "Lost" },
];

export default function Pipeline() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDeals((data as Deal[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function handleStageChange(dealId: string, nextStage: Deal["stage"]) {
    const previousStage = deals.find((d) => d.id === dealId)?.stage;
    if (!previousStage || previousStage === nextStage) return;

    // Move the card immediately, then roll back if the write fails.
    setDeals((current) =>
      current.map((d) => (d.id === dealId ? { ...d, stage: nextStage } : d))
    );

    const { error } = await supabase.from("deals").update({ stage: nextStage }).eq("id", dealId);

    if (error) {
      setDeals((current) =>
        current.map((d) => (d.id === dealId ? { ...d, stage: previousStage } : d))
      );
      toast.error("Couldn't update the deal stage. Please try again.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
        <p className="text-muted-foreground">Every deal you've analyzed, tracked from lead to close.</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading pipeline…</p>}

      {!loading && deals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No deals yet. Run the Deal Analyzer to add your first one.
          </CardContent>
        </Card>
      )}

      {!loading && deals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.id);
            return (
              <div key={stage.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <Badge variant="secondary">{stageDeals.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id}>
                      <CardHeader className="space-y-2 p-3">
                        <CardTitle className="text-sm font-medium">{deal.address}</CardTitle>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{deal.price ? `$${deal.price.toLocaleString()}` : "—"}</span>
                          {deal.investment_score != null && (
                            <Badge variant="outline">{deal.investment_score}</Badge>
                          )}
                        </div>
                        <Select
                          value={deal.stage}
                          onValueChange={(v) => handleStageChange(deal.id, v as Deal["stage"])}
                        >
                          <SelectTrigger className="h-8 text-xs" aria-label={`Stage for ${deal.address}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
