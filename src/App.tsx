import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import AppLayout from "./components/AppLayout";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";
import WizardPlaceholder from "./pages/WizardPlaceholder";
import HackathonsPlaceholder from "./pages/HackathonsPlaceholder";
import HackathonsDashboard from "./pages/HackathonsDashboard";
import { Loader2 } from "lucide-react";
import ChatWidget from "./components/ChatWidget";

function ProtectedRoute({
  children,
  allowedRole,
}: {
  children?: React.ReactNode;
  allowedRole?: "participant" | "organizer";
}) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        role="status"
        aria-label="Loading auth state"
      >
        <Loader2 className="w-6 h-6 text-accent animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && auth.role !== allowedRole) {
    if (auth.role === "organizer") return <Navigate to="/dashboard" replace />;
    if (auth.role === "participant") return <Navigate to="/wizard" replace />;
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}


export default function App() {
  const auth = useAuth();

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            auth.status === "authenticated" ? (
              auth.role === "organizer" ? (
                <Navigate to="/dashboard" replace />
              ) : auth.role === "participant" ? (
                <Navigate to="/hackathons" replace />
              ) : (
                <Auth />
              )
            ) : auth.status === "unauthenticated" ? (
              <Auth />
            ) : (
              <div
                className="min-h-screen bg-background flex items-center justify-center"
                role="status"
                aria-label="Loading app"
              >
                <Loader2 className="w-6 h-6 text-accent animate-spin" aria-hidden="true" />
              </div>
            )
          }
        />

        <Route
          path="/register"
          element={
            auth.status === "loading" ? (
              <div
                className="min-h-screen bg-background flex items-center justify-center"
                role="status"
                aria-label="Loading app"
              >
                <Loader2 className="w-6 h-6 text-accent animate-spin" aria-hidden="true" />
              </div>
            ) : auth.status !== "authenticated" ? (
              <Navigate to="/" replace />
            ) : auth.role === "organizer" ? (
              <Navigate to="/dashboard" replace />
            ) : auth.role === "participant" ? (
              <Navigate to="/hackathons" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/hackathons"
          element={
            auth.status === "loading" ? (
              <div
                className="min-h-screen bg-background flex items-center justify-center"
                role="status"
                aria-label="Loading app"
              >
                <Loader2 className="w-6 h-6 text-accent animate-spin" aria-hidden="true" />
              </div>
            ) : auth.status !== "authenticated" ? (
              <Navigate to="/" replace />
            ) : (
              <HackathonsDashboard />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="organizer">
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hackathons-management"
            element={
              <ProtectedRoute allowedRole="organizer">
                <HackathonsPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wizard"
            element={
              <ProtectedRoute allowedRole="participant">
                <WizardPlaceholder />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
    </>
  );
}