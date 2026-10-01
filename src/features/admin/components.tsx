// Building blocks shared by the admin pages.
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Loader2, MessageCircle, Search } from "lucide-react";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button, { buttonClasses } from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import type { CodeStatus, IssuedCode } from "./adminApi";
import { CODE_STATUS } from "./format";

export function CodeStatusBadge({ status }: { status: CodeStatus }) {
  const { label, tone } = CODE_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function LoadingBlock({ label = "Memuat data…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 py-10 text-sm text-fg-subtle" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="space-y-3 py-6">
      <Alert tone="danger" title={message} />
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function SearchBar({ initial, placeholder, onSearch }: { initial: string; placeholder: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value.trim());
  };
  return (
    <form role="search" onSubmit={submit} className="flex gap-2">
      <label htmlFor="admin-search" className="sr-only">
        Cari
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <Input id="admin-search" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      <Button type="submit" variant="secondary" size="lg" className="h-11">
        Cari
      </Button>
    </form>
  );
}

export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3 pt-4">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} icon={<ChevronLeft className="size-4" aria-hidden="true" />}>
        Sebelumnya
      </Button>
      <p className="text-sm text-fg-muted tabular-nums">
        Halaman {page} dari {pages}
      </p>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Berikutnya
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}

export function CopyButton({ text, label, copiedLabel = "Tersalin" }: { text: string; label: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the text stays visible for manual copy.
    }
  };
  return (
    <Button variant="secondary" onClick={copy} icon={copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}

/** Shows a newly issued code once, with copy and send-to-WhatsApp actions. */
export function IssuedCodePanel({ issued }: { issued: IssuedCode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger" role="note">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Kode ini hanya ditampilkan sekali. Kirim ke pembeli sekarang sebelum menutup halaman ini.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-fg-muted">Kode akses · paket {issued.planName}</p>
        <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-wider text-fg sm:text-3xl">{issued.code}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {issued.buyerWhatsappUrl && (
          <a href={issued.buyerWhatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Kirim via WhatsApp
          </a>
        )}
        <CopyButton text={issued.code} label="Salin kode" />
        <CopyButton text={issued.message} label="Salin pesan" />
      </div>

      <details className="rounded-md border border-line">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-fg-muted">Lihat isi pesan</summary>
        <pre className="whitespace-pre-wrap border-t border-line px-3 py-2.5 font-sans text-sm text-fg">{issued.message}</pre>
      </details>
    </div>
  );
}

/** Label/value pair for detail pages. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{children}</dd>
    </div>
  );
}

export function Panel({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface shadow-card">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}
