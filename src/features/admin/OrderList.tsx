import { ChevronRight } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { Link } from "../../lib/router";
import type { OrderRow } from "./adminApi";
import { CodeStatusBadge } from "./components";
import { formatDateTime, formatRupiah, formatWhatsapp, ORDER_STATUS, PAYMENT_LABELS } from "./format";

/** Orders as tappable rows: stacked on phones, columns on larger screens. */
export default function OrderList({ orders, empty }: { orders: OrderRow[]; empty: string }) {
  if (orders.length === 0) {
    return <p className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-fg-muted">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link to={`/super-admin/pesanan/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-subtle sm:px-5">
            <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-[1.4fr_1fr_1fr] md:items-center md:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{o.buyerName}</p>
                <p className="truncate text-sm text-fg-subtle">{o.buyerEmail ?? formatWhatsapp(o.buyerWhatsapp)}</p>
              </div>
              <div className="text-sm">
                <p className="text-fg">
                  {o.planName} · <span className="tabular-nums">{formatRupiah(o.amountIdr)}</span>
                </p>
                <p className="text-fg-subtle">
                  {o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : o.provider === "midtrans" ? "Otomatis" : "-"} · {formatDateTime(o.createdAt)}
                </p>
                {o.campaign && <p className="truncate text-xs text-fg-subtle">Kampanye: {o.campaign}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {o.status !== "fulfilled" && <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>}
                {o.code ? (
                  <>
                    <span className="font-mono text-fg-muted">…{o.code.hint}</span>
                    <CodeStatusBadge status={o.code.status} />
                  </>
                ) : (
                  o.status === "fulfilled" && <span className="text-fg-subtle">Belum ada kode</span>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
