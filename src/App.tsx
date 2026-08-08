import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import QuickAnalyze from "@/pages/QuickAnalyze";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import DealAnalyzer from "@/pages/dashboard/DealAnalyzer";
import ListingCopywriter from "@/pages/dashboard/ListingCopywriter";
import LeadScorer from "@/pages/dashboard/LeadScorer";
import Pipeline from "@/pages/dashboard/Pipeline";
import Analytics from "@/pages/dashboard/Analytics";
import SettingsPage from "@/pages/dashboard/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/analyze" element={<QuickAnalyze />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <DashboardHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/deals"
              element={
                <ProtectedRoute>
                  <DealAnalyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/listings"
              element={
                <ProtectedRoute>
                  <ListingCopywriter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/leads"
              element={
                <ProtectedRoute>
                  <LeadScorer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/pipeline"
              element={
                <ProtectedRoute>
                  <Pipeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
