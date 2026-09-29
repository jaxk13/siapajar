import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Home, LogOut, Menu, Moon, RotateCcw, Sun, X } from "lucide-react";
import { Link } from "../../lib/router";
import Logo from "../ui/Logo";
import SkipLink from "./SkipLink";

export interface AppNavItem {
  path: string;
  label: string;
  count?: number;
}

interface AppShellProps {
  currentPath: string;
  steps: AppNavItem[];
  title: string;
  description?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onResetData: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export default function AppShell({
  currentPath,
  steps,
  title,
  description,
  theme,
  onToggleTheme,
  onResetData,
  onLogout,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the drawer whenever the page changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPath]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const nav = (
    <SidebarContent
      currentPath={currentPath}
      steps={steps}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onResetData={onResetData}
      onLogout={onLogout}
    />
  );

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SkipLink />

      <aside
        id="sidebar"
        aria-label="Menu aplikasi"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex"
      >
        {nav}
      </aside>

      {drawerOpen && <MobileDrawer onClose={closeDrawer}>{nav}</MobileDrawer>}

      <div id="main" className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="topbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
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

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-fg">{title}</p>
            {description && <p className="hidden truncate text-sm text-fg-subtle sm:block">{description}</p>}
          </div>

          <p className="hidden shrink-0 items-center gap-2 text-sm text-fg-muted sm:flex">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Akses aktif
          </p>
        </header>

        <main id="main-content" tabIndex={-1} className="content-wrap mx-auto w-full max-w-5xl flex-1 p-4 outline-none sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentPath,
  steps,
  theme,
  onToggleTheme,
  onResetData,
  onLogout,
}: Omit<AppShellProps, "title" | "description" | "children">) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link to="/app" aria-label="SIAPAJAR.id, ke beranda aplikasi" className="rounded-md">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Navigasi aplikasi" className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink to="/app" active={currentPath === "/app"}>
          <Home className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Beranda</span>
        </NavLink>

        <p id="nav-steps-label" className="mt-6 px-3 pb-2 text-xs font-semibold text-fg-subtle">
          Penyusunan naskah
        </p>
        <ol aria-labelledby="nav-steps-label" className="space-y-0.5">
          {steps.map((step, index) => {
            const active = currentPath === step.path;
            return (
              <li key={step.path}>
                <NavLink to={step.path} active={active}>
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold tabular-nums ${
                      active ? "bg-primary text-primary-fg" : "bg-subtle text-fg-muted"
                    }`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  {step.count !== undefined && (
                    <span className="text-xs font-semibold tabular-nums text-fg-subtle">
                      {step.count}
                      <span className="sr-only"> soal</span>
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-line px-3 py-3">
        <SidebarButton onClick={onToggleTheme}>
          {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          {theme === "dark" ? "Mode terang" : "Mode gelap"}
        </SidebarButton>
        <SidebarButton onClick={onResetData}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Atur ulang data
        </SidebarButton>
        <SidebarButton onClick={onLogout}>
          <LogOut className="size-4" aria-hidden="true" />
          Keluar
        </SidebarButton>
      </div>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-primary-soft font-semibold text-primary-text" : "font-medium text-fg-muted hover:bg-subtle hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}

function SidebarButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-subtle hover:text-fg"
    >
      {children}
    </button>
  );
}

/** Off-canvas navigation for tablet/mobile: traps focus, closes on Escape or backdrop click. */
function MobileDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu aplikasi">
      <div className="absolute inset-0 bg-fg/40" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="relative h-full w-72 max-w-[85vw] bg-surface shadow-overlay">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-md text-fg-muted hover:bg-subtle"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
