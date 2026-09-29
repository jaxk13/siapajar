import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  invalid: boolean;
}

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Receives the id and aria wiring so label, hint and error stay connected. */
  children: (control: FieldControlProps) => ReactNode;
}

export default function FormField({ id, label, hint, error, optional = false, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-fg">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-fg-subtle">Opsional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}
