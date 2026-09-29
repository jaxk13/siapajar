interface LogoProps {
  className?: string;
}

/** SIAPAJAR mark: an exam sheet with a checked line, plus the wordmark. */
export default function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--color-brand-600)" />
        <path d="M10 7.5h8.5L23 12v12.5H10z" fill="#fff" />
        <path d="M18.5 7.5V12H23" fill="none" stroke="var(--color-brand-200)" strokeWidth="1.2" />
        <path d="M12.8 16.2l1.6 1.6 3-3.2" fill="none" stroke="var(--color-brand-600)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.8 21h7.4" stroke="var(--color-brand-300)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-fg">
        SIAPAJAR<span className="font-medium text-fg-subtle">.id</span>
      </span>
    </span>
  );
}
