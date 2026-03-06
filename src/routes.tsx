import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import { AuthProvider } from "./data/AuthContext";

// Lazy-loaded page components
const Home = lazy(() => import("./pages/Home"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const TimeLog = lazy(() => import("./pages/TimeLog"));
const Insights = lazy(() => import("./pages/Insights"));
const Invoicing = lazy(() => import("./pages/Invoicing"));
const Settings = lazy(() => import("./pages/Settings"));
const Team = lazy(() => import("./pages/Team"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function OnboardingWithAuth() {
  return (
    <AuthProvider>
      <SuspensePage><Onboarding /></SuspensePage>
    </AuthProvider>
  );
}

function LoginWithAuth() {
  return (
    <AuthProvider>
      <SuspensePage><Login /></SuspensePage>
    </AuthProvider>
  );
}

function SignupWithAuth() {
  return (
    <AuthProvider>
      <SuspensePage><Signup /></SuspensePage>
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
  { path: "/login", Component: LoginWithAuth },
  { path: "/signup", Component: SignupWithAuth },
  { path: "/reset-password", element: <SuspensePage><ResetPassword /></SuspensePage> },
  { path: "/onboarding", Component: OnboardingWithAuth },
  { path: "/portal/:token", element: <SuspensePage><ClientPortal /></SuspensePage> },
  { path: "/terms", element: <SuspensePage><Terms /></SuspensePage> },
  { path: "/privacy", element: <SuspensePage><Privacy /></SuspensePage> },
  { path: "/accept-invite", element: <SuspensePage><AcceptInvite /></SuspensePage> },
  {
    path: "/",
    Component: Root,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, element: <SuspensePage><Home /></SuspensePage> },
      { path: "clients", element: <SuspensePage><Clients /></SuspensePage> },
      { path: "clients/:clientId", element: <SuspensePage><ClientDetail /></SuspensePage> },
      { path: "projects", element: <SuspensePage><Projects /></SuspensePage> },
      { path: "projects/:clientId/:projectId", element: <SuspensePage><ProjectDetail /></SuspensePage> },
      { path: "time", element: <SuspensePage><TimeLog /></SuspensePage> },
      { path: "insights", element: <SuspensePage><Insights /></SuspensePage> },
      { path: "invoicing", element: <SuspensePage><Invoicing /></SuspensePage> },
      { path: "settings", element: <SuspensePage><Settings /></SuspensePage> },
      { path: "team", element: <SuspensePage><Team /></SuspensePage> },
    ],
  },
]);
