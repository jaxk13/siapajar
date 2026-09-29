import { Loader2 } from "lucide-react";
import { AccessProvider, useAccess } from "./features/access/AccessProvider";
import { Redirect, RouterProvider, useRouter } from "./lib/router";
import AccessPage from "./pages/AccessPage";
import AppPage from "./pages/AppPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <AccessProvider>
      <RouterProvider>
        <Routes />
      </RouterProvider>
    </AccessProvider>
  );
}

function Routes() {
  const { path } = useRouter();
  const { status } = useAccess();
  const normalized = path.replace(/\/+$/, "") || "/";

  if (normalized === "/") {
    return <LandingPage />;
  }

  const needsAccessState = normalized === "/masuk" || normalized === "/app" || normalized.startsWith("/app/");
  if (needsAccessState && status === "checking") {
    return <CheckingSession />;
  }

  if (normalized === "/masuk") {
    return status === "active" ? <Redirect to="/app" /> : <AccessPage />;
  }

  if (normalized === "/app" || normalized.startsWith("/app/")) {
    return status === "active" ? <AppPage path={normalized} /> : <Redirect to="/masuk" />;
  }

  return <NotFoundPage />;
}

function CheckingSession() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-fg-subtle" aria-hidden="true" />
      <span className="sr-only">Memeriksa sesi…</span>
    </div>
  );
}
