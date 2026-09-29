// Minimal History API router. The app has only a handful of routes, so a
// router dependency is not justified yet (AGENTS.md §7).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

interface NavigateOptions {
  replace?: boolean;
}

interface RouterValue {
  path: string;
  navigate: (to: string, options?: NavigateOptions) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

/** Moves focus to the page's main landmark so screen readers announce the new page. */
function focusMainContent() {
  requestAnimationFrame(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
  });
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    const url = new URL(to, window.location.origin);
    const current = window.location.pathname + window.location.search + window.location.hash;
    const next = url.pathname + url.search + url.hash;

    if (next !== current) {
      if (options?.replace) {
        window.history.replaceState(null, "", next);
      } else {
        window.history.pushState(null, "", next);
      }
    }
    setPath(url.pathname);

    if (url.hash) {
      requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView());
    } else {
      window.scrollTo(0, 0);
      focusMainContent();
    }
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used inside RouterProvider");
  return ctx;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
}

/** Internal link: client-side navigation, while keeping normal browser behavior for new tabs. */
export function Link({ to, onClick, target, ...rest }: LinkProps) {
  const { navigate } = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (target && target !== "_self") return;
    e.preventDefault();
    navigate(to);
  };

  return <a href={to} target={target} onClick={handleClick} {...rest} />;
}

export function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — SIAPAJAR.id`;
  }, [title]);
}
