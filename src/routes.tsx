import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import TimeLog from "./pages/TimeLog";
import Insights from "./pages/Insights";
import Invoicing from "./pages/Invoicing";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import ClientPortal from "./pages/ClientPortal";
import { AuthProvider } from "./data/AuthContext";

function OnboardingWithAuth() {
  return (
    <AuthProvider>
      <Onboarding />
    </AuthProvider>
  );
}

function RootErrorBoundary() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-primary text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">An unexpected error occurred. Please try refreshing the page.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "/onboarding", Component: OnboardingWithAuth },
  { path: "/portal/:token", Component: ClientPortal },
  {
    path: "/",
    Component: Root,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: "clients", Component: Clients },
      { path: "clients/:clientId", Component: ClientDetail },
      { path: "projects", Component: Projects },
      { path: "projects/:clientId/:projectId", Component: ProjectDetail },
      { path: "time", Component: TimeLog },
      { path: "insights", Component: Insights },
      { path: "invoicing", Component: Invoicing },
      { path: "settings", Component: Settings },
    ],
  },
]);
