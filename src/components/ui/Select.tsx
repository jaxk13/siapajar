import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export default function Select({ invalid = false, className = "", children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={`block h-11 w-full appearance-none rounded-md border bg-surface pl-3 pr-10 text-base text-fg transition-colors duration-150 disabled:bg-subtle disabled:text-fg-subtle ${
          invalid ? "border-danger" : "border-line-strong hover:border-fg-subtle"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
    </div>
  );
}
