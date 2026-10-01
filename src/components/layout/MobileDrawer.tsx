import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Off-canvas navigation for tablet/mobile: traps focus, closes on Escape or backdrop click. */
export default function MobileDrawer({ onClose, children, label = "Menu aplikasi" }: { onClose: () => void; children: ReactNode; label?: string }) {
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
    <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
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
