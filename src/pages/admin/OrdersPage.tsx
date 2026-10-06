import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Select from "../../components/ui/Select";
import { adminApi, type OrderFilter } from "../../features/admin/adminApi";
import { useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, LoadingBlock, Pagination, SearchBar } from "../../features/admin/components";
import OrderList from "../../features/admin/OrderList";
import { usePageTitle } from "../../lib/router";
import { NewOrderButton } from "./AdminOverviewPage";

const PAGE_SIZE = 20;

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "paid", label: "Lunas" },
  { value: "unpaid", label: "Menunggu bayar" },
  { value: "closed", label: "Kedaluwarsa / gagal" },
];

export default function OrdersPage() {
  usePageTitle("Pesanan");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderFilter>(() => {
    const value = new URLSearchParams(window.location.search).get("status") ?? "";
    return FILTERS.some((f) => f.value === value) ? (value as OrderFilter) : "";
  });
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.orders(search, status, page), [search, status, page]);

  return (
    <AdminShell title="Pesanan" actions={<NewOrderButton />}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Pesanan</h1>
          <p className="mt-1 text-sm text-fg-muted">Pembelian otomatis dan manual, termasuk checkout yang belum dibayar.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <SearchBar
            initial={search}
            placeholder="Cari nama, email, nomor WA, atau 4 karakter terakhir kode"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <div>
            <label htmlFor="order-status" className="sr-only">
              Filter status
            </label>
            <Select
              id="order-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderFilter);
                setPage(1);
              }}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {data && (
          <p className="text-sm text-fg-subtle" aria-live="polite">
            {data.total} pesanan{search ? ` untuk "${search}"` : ""}
          </p>
        )}
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && (
          <div className={loading ? "opacity-60" : undefined}>
            <OrderList orders={data.orders} empty={search || status ? "Tidak ada pesanan yang cocok." : "Belum ada pesanan."} />
            <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
