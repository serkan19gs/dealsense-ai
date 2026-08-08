import { Link } from "react-router-dom";
import { Calculator, FileText, Users, Kanban, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const QUICK_LINKS = [
  { to: "/app/deals", label: "Analyze a deal", icon: Calculator, description: "Cash flow, cap rate, investment score" },
  { to: "/app/listings", label: "Write listing copy", icon: FileText, description: "MLS-ready description in seconds" },
  { to: "/app/leads", label: "Score a lead", icon: Users, description: "Prioritize who to call first" },
  { to: "/app/pipeline", label: "View pipeline", icon: Kanban, description: "Track every deal in one board" },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          You're on the <span className="font-medium capitalize">{tier}</span> plan.
          {tier === "free" && (
            <>
              {" "}
              <Link to="/pricing" className="text-primary hover:underline">
                Upgrade for unlimited analyses →
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Card key={item.to} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <item.icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" size="sm" className="px-0">
                <Link to={item.to}>
                  Go <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
