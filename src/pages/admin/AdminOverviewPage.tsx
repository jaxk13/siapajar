import { Plus } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import { buttonClasses } from "../../components/ui/Button";
import { adminApi } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
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

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <dt className="text-sm text-fg-muted">{label}</dt>
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
