import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { adminApi } from "../../features/admin/adminApi";
import { useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, LoadingBlock, Pagination, SearchBar } from "../../features/admin/components";
import OrderList from "../../features/admin/OrderList";
import { usePageTitle } from "../../lib/router";
import { NewOrderButton } from "./AdminOverviewPage";

const PAGE_SIZE = 20;

export default function OrdersPage() {
  usePageTitle("Pesanan");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.orders(search, page), [search, page]);

  return (
    <AdminShell title="Pesanan" actions={<NewOrderButton />}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Pesanan</h1>
          <p className="mt-1 text-sm text-fg-muted">Setiap pembelian yang sudah diverifikasi beserta kode aksesnya.</p>
        </div>
        <SearchBar
          initial={search}
          placeholder="Cari nama, nomor WA, atau 4 karakter terakhir kode"
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        {data && (
          <p className="text-sm text-fg-subtle" aria-live="polite">
            {data.total} pesanan{search ? ` untuk "${search}"` : ""}
          </p>
        )}
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && (
          <div className={loading ? "opacity-60" : undefined}>
            <OrderList orders={data.orders} empty={search ? "Tidak ada pesanan yang cocok." : "Belum ada pesanan."} />
            <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
