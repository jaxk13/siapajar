import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons shown at the bottom. */
  footer?: ReactNode;
}

/**
 * Modal built on the native <dialog> element: focus is kept inside, Escape closes,
 * and the page behind is inert. Used for confirmations and one-off results.
 */
export default function Dialog({ open, title, description, onClose, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-surface p-0 text-fg shadow-overlay backdrop:bg-fg/40"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold text-fg">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-subtle"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
