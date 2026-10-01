import type { Ref, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export default function Textarea({ invalid = false, className = "", rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`block w-full rounded-md border bg-surface px-3 py-2.5 text-base text-fg placeholder:text-fg-subtle transition-colors duration-150 ${
        invalid ? "border-danger" : "border-line-strong hover:border-fg-subtle"
      } ${className}`}
      {...rest}
    />
  );
}
