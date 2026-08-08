import { type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Users,
  Kanban,
  BarChart3,
  Settings,
  Home,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/deals", label: "Deal Analyzer", icon: Calculator },
  { to: "/app/listings", label: "Listing Copywriter", icon: FileText },
  { to: "/app/leads", label: "Lead Scorer", icon: Users },
  { to: "/app/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-muted/30 p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 font-bold text-lg">
          <Home className="h-5 w-5 text-primary" />
          DealSense
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            <Badge variant={tier === "free" ? "outline" : "default"} className="capitalize">
              {tier}
            </Badge>
          </div>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-background">
        <div className="container max-w-6xl py-8">{children}</div>
      </main>
    </div>
  );
}
