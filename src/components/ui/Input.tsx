import type { InputHTMLAttributes, Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export default function Input({ invalid = false, className = "", ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`block w-full h-11 rounded-md border bg-surface px-3 text-base text-fg placeholder:text-fg-subtle transition-colors duration-150 disabled:bg-subtle disabled:text-fg-subtle ${
        invalid ? "border-danger" : "border-line-strong hover:border-fg-subtle"
      } ${className}`}
      {...rest}
    />
  );
}
