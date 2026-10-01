import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { History, Home, KeyRound, LogOut, Menu, Receipt, Settings, Tag, UserCog, Users, type LucideIcon } from "lucide-react";
import { useAdmin } from "../../features/admin/AdminProvider";
import { ROLE_LABELS } from "../../features/admin/format";
import { Link, useRouter } from "../../lib/router";
import Logo from "../ui/Logo";
import MobileDrawer from "./MobileDrawer";
import SkipLink from "./SkipLink";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { path: "/super-admin", label: "Ringkasan", icon: Home },
  { path: "/super-admin/pesanan", label: "Pesanan", icon: Receipt },
  { path: "/super-admin/kode", label: "Kode Akses", icon: KeyRound },
];

const SUPER_NAV: NavItem[] = [
  { path: "/super-admin/paket", label: "Paket & Harga", icon: Tag },
  { path: "/super-admin/tim", label: "Tim Admin", icon: Users },
  { path: "/super-admin/pengaturan", label: "Pengaturan", icon: Settings },
  { path: "/super-admin/aktivitas", label: "Aktivitas", icon: History },
];

interface AdminShellProps {
  title: string;
  /** Primary actions for the page, shown in the top bar. */
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminShell({ title, actions, children }: AdminShellProps) {
  const { path } = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SkipLink />

      <aside aria-label="Menu admin" className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <AdminNav />
      </aside>

      {drawerOpen && (
        <MobileDrawer onClose={closeDrawer} label="Menu admin">
          <AdminNav />
        </MobileDrawer>
      )}

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
            className="-ml-1 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-subtle lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-semibold text-fg">{title}</p>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 p-4 outline-none sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNav() {
  const { path } = useRouter();
  const { user, isSuperAdmin, logout } = useAdmin();
  const { navigate } = useRouter();

  const isActive = (itemPath: string) =>
    itemPath === "/super-admin" ? path === itemPath : path === itemPath || path.startsWith(`${itemPath}/`);

  const handleLogout = async () => {
    await logout();
    navigate("/super-admin/masuk", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-5">
        <Link to="/super-admin" aria-label="Ringkasan panel admin" className="rounded-md">
          <Logo />
        </Link>
        <span className="rounded bg-fg px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-canvas">Admin</span>
      </div>

      <nav aria-label="Navigasi admin" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <li key={item.path}>
              <NavLink item={item} active={isActive(item.path)} />
            </li>
          ))}
        </ul>

        {isSuperAdmin && (
          <>
            <p id="nav-super-label" className="mt-6 px-3 pb-2 text-xs font-semibold text-fg-subtle">
              Pengelolaan
            </p>
            <ul aria-labelledby="nav-super-label" className="space-y-0.5">
              {SUPER_NAV.map((item) => (
                <li key={item.path}>
                  <NavLink item={item} active={isActive(item.path)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-line px-3 py-3">
        {user && (
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-subtle">
              {ROLE_LABELS[user.role]} · {user.email}
            </p>
          </div>
        )}
        <NavLink item={{ path: "/super-admin/akun", label: "Akun saya", icon: UserCog }} active={isActive("/super-admin/akun")} />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-subtle hover:text-fg"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-primary-soft font-semibold text-primary-text" : "font-medium text-fg-muted hover:bg-subtle hover:text-fg"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
