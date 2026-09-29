import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 sm:py-16">
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-fg">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
