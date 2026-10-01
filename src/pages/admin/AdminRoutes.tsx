// Routes under /super-admin (see src/README.md §2). Guards:
//  - not signed in            → /super-admin/masuk
//  - temporary password       → only /super-admin/akun
//  - admin (not super admin)  → management pages redirect to /super-admin
import { Loader2 } from "lucide-react";
import { AdminProvider, useAdmin } from "../../features/admin/AdminProvider";
import { Redirect } from "../../lib/router";
import AccountPage from "./AccountPage";
import ActivityPage from "./ActivityPage";
import AdminLoginPage from "./AdminLoginPage";
import AdminOverviewPage from "./AdminOverviewPage";
import CodesPage from "./CodesPage";
import OrderCreatePage from "./OrderCreatePage";
import OrderDetailPage from "./OrderDetailPage";
import OrdersPage from "./OrdersPage";
import PlansPage from "./PlansPage";
import SettingsPage from "./SettingsPage";
import TeamPage from "./TeamPage";

const SUPER_ADMIN_ONLY = new Set(["/super-admin/paket", "/super-admin/tim", "/super-admin/pengaturan", "/super-admin/aktivitas"]);

export default function AdminRoutes({ path }: { path: string }) {
  return (
    <AdminProvider>
      <AdminRouter path={path} />
    </AdminProvider>
  );
}

function AdminRouter({ path }: { path: string }) {
  const { status, user, isSuperAdmin } = useAdmin();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-live="polite">
        <Loader2 className="size-6 animate-spin text-fg-subtle" aria-hidden="true" />
        <span className="sr-only">Memeriksa sesi admin…</span>
      </div>
    );
  }

  if (path === "/super-admin/masuk") {
    return status === "active" ? <Redirect to="/super-admin" /> : <AdminLoginPage />;
  }
  if (status !== "active" || !user) return <Redirect to="/super-admin/masuk" />;

  if (user.mustChangePassword && path !== "/super-admin/akun") return <Redirect to="/super-admin/akun" />;
  if (SUPER_ADMIN_ONLY.has(path) && !isSuperAdmin) return <Redirect to="/super-admin" />;

  const orderMatch = path.match(/^\/super-admin\/pesanan\/([0-9a-f-]{36})$/i);
  if (orderMatch) return <OrderDetailPage id={orderMatch[1]} />;

  switch (path) {
    case "/super-admin":
      return <AdminOverviewPage />;
    case "/super-admin/pesanan":
      return <OrdersPage />;
    case "/super-admin/pesanan/baru":
      return <OrderCreatePage />;
    case "/super-admin/kode":
      return <CodesPage />;
    case "/super-admin/paket":
      return <PlansPage />;
    case "/super-admin/tim":
      return <TeamPage />;
    case "/super-admin/pengaturan":
      return <SettingsPage />;
    case "/super-admin/aktivitas":
      return <ActivityPage />;
    case "/super-admin/akun":
      return <AccountPage />;
    default:
      return <Redirect to="/super-admin" />;
  }
}
