import { Plus } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import { buttonClasses } from "../../components/ui/Button";
import { adminApi } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import Alert from "../../components/ui/Alert";
import { ErrorBlock, LoadingBlock } from "../../features/admin/components";
import { formatRupiah } from "../../features/admin/format";
import OrderList from "../../features/admin/OrderList";
import { Link, usePageTitle } from "../../lib/router";

export default function AdminOverviewPage() {
  usePageTitle("Ringkasan Admin");
  const { user } = useAdmin();
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.overview(), []);

  return (
    <AdminShell title="Ringkasan" actions={<NewOrderButton />}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Halo, {user?.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-fg-muted">Ringkasan pesanan dan kode akses SIAPAJAR.</p>
        </div>

        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}

        {data && (
          <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Pesanan hari ini" value={String(data.orders.ordersToday)} />
              <Stat label="Pendapatan bulan ini" value={formatRupiah(data.orders.revenueMonth)} note={`${data.orders.ordersMonth} pesanan`} />
              <Stat label="Kode aktif" value={String(data.codes.active)} note={`${data.codes.expiringSoon} berakhir ≤ 7 hari`} />
              <Stat label="Kode belum dipakai" value={String(data.codes.unused)} />
            </dl>

            {data.orders.undeliveredPaid > 0 && (
              <Alert tone="danger" title={`${data.orders.undeliveredPaid} pesanan lunas belum menerima kode akses.`}>
                <Link to="/super-admin/pesanan?status=paid" className="font-semibold text-danger underline underline-offset-2">
                  Lihat pesanan lunas
                </Link>{" "}
                lalu buka pesanan berstatus “Lunas, kode belum terkirim” untuk mengirim ulang.
              </Alert>
            )}

            <section aria-labelledby="checkout-title" className="space-y-3">
              <div>
                <h2 id="checkout-title" className="text-base font-semibold text-fg">
                  Pembelian otomatis bulan ini
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">Pengunjung dan performa iklan dilihat di Meta Ads Manager.</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat label="Checkout" value={String(data.orders.checkoutsMonth)} note="Mengisi form dan membuka pembayaran" />
                <Stat
                  label="Menunggu bayar"
                  value={String(data.orders.unpaidOpen)}
                  note="Bisa diingatkan lewat WhatsApp"
                  to="/super-admin/pesanan?status=unpaid"
                />
                <Stat label="Kedaluwarsa / gagal" value={String(data.orders.closedMonth)} to="/super-admin/pesanan?status=closed" />
              </dl>
            </section>

            <section aria-labelledby="recent-title" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="recent-title" className="text-base font-semibold text-fg">
                  Pesanan terbaru
                </h2>
                <Link to="/super-admin/pesanan" className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline">
                  Lihat semua
                </Link>
              </div>
              <OrderList orders={data.recentOrders} empty="Belum ada pesanan. Buat pesanan setelah pembayaran pembeli diverifikasi." />
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, note, to }: { label: string; value: string; note?: string; to?: string }) {
  return (
    <div className="relative rounded-lg border border-line bg-surface px-4 py-3.5 has-[a:hover]:bg-subtle">
      <dt className="text-sm text-fg-muted">
        {to ? (
          <Link to={to} className="after:absolute after:inset-0 hover:text-fg">
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-fg sm:text-2xl">{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-fg-subtle">{note}</dd>}
    </div>
  );
}

export function NewOrderButton() {
  return (
    <Link to="/super-admin/pesanan/baru" className={buttonClasses("primary", "md")}>
      <Plus className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Buat Pesanan</span>
      <span className="sm:hidden">Pesanan</span>
    </Link>
  );
}
