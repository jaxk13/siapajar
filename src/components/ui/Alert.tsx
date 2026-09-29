import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type AlertTone = "danger" | "success" | "info";

const TONES: Record<AlertTone, { box: string; icon: typeof Info }> = {
  danger: { box: "bg-danger-soft border-danger-line text-danger", icon: AlertCircle },
  success: { box: "bg-success-soft border-success/30 text-success", icon: CheckCircle2 },
  info: { box: "bg-primary-soft border-brand-200 text-primary-text", icon: Info },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export default function Alert({ tone = "info", title, children, className = "" }: AlertProps) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm ${box} ${className}`}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-fg-muted">{children}</div>}
      </div>
    </div>
  );
}
