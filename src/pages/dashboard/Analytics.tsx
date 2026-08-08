import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Analysis } from "@/types/database";

const KIND_LABELS: Record<Analysis["kind"], string> = {
  deal_analysis: "Deal analyses",
  listing_copy: "Listing copy",
  lead_score: "Lead scores",
  market_pulse: "Market pulse",
};

export default function Analytics() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setAnalyses((data as Analysis[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const dailySeries = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map((day) => {
      const label = format(day, "MMM d");
      const count = analyses.filter(
        (a) => startOfDay(new Date(a.created_at)).getTime() === day.getTime()
      ).length;
      return { day: label, count };
    });
  }, [analyses]);

  const byKind = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of analyses) {
      counts[a.kind] = (counts[a.kind] ?? 0) + 1;
    }
    return Object.entries(counts).map(([kind, count]) => ({
      kind: KIND_LABELS[kind as Analysis["kind"]] ?? kind,
      count,
    }));
  }, [analyses]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Analytics</h1>
        <p className="text-muted-foreground">How you're using DealSense over the last 14 days.</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading analytics…</p>}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI runs per day</CardTitle>
              <CardDescription>Deal analyses, listing copy, and lead scores combined.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage by feature</CardTitle>
              <CardDescription>Which tools you rely on most.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byKind}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="kind" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
