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
  const { isActive } = useAccess();
  const normalized = path.replace(/\/+$/, "") || "/";

  if (normalized === "/") {
    return <LandingPage />;
  }

  if (normalized === "/masuk") {
    return isActive ? <Redirect to="/app" /> : <AccessPage />;
  }

  if (normalized === "/app" || normalized.startsWith("/app/")) {
    return isActive ? <AppPage path={normalized} /> : <Redirect to="/masuk" />;
  }

  return <NotFoundPage />;
}
