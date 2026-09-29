import type { ReactNode } from "react";

type BadgeTone = "neutral" | "brand" | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-fg-muted",
  brand: "bg-primary-soft text-primary-text",
  outline: "border border-line-strong text-fg-muted",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export default function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded text-xs font-semibold tabular-nums ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
