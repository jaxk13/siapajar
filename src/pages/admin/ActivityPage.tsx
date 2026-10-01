import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { adminApi, type ActivityRow } from "../../features/admin/adminApi";
import { useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, LoadingBlock, Pagination } from "../../features/admin/components";
import { actionLabel, formatDateTime, formatRupiah } from "../../features/admin/format";
import { Link, usePageTitle } from "../../lib/router";

const PAGE_SIZE = 30;

export default function ActivityPage() {
  usePageTitle("Aktivitas");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.activity(page), [page]);

  return (
    <AdminShell title="Aktivitas">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Riwayat aktivitas</h1>
          <p className="mt-1 text-sm text-fg-muted">Setiap tindakan tim admin tercatat: siapa, apa, dan kapan.</p>
        </div>
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && (
          <>
            <ol className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${loading ? "opacity-60" : ""}`}>
              {data.activity.length === 0 && <li className="px-4 py-10 text-center text-sm text-fg-muted">Belum ada aktivitas.</li>}
              {data.activity.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
                  <time dateTime={a.createdAt} className="shrink-0 text-xs tabular-nums text-fg-subtle sm:w-40">
                    {formatDateTime(a.createdAt)}
                  </time>
                  <p className="text-sm text-fg">
                    <span className="font-semibold">{a.userName ?? "CLI server"}</span> {actionLabel(a.action).toLowerCase()}
                    <ActivityDetail row={a} />
                  </p>
                </li>
              ))}
            </ol>
            <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </AdminShell>
  );
}

function ActivityDetail({ row }: { row: ActivityRow }) {
  const m = row.metadata ?? {};
  const parts: string[] = [];
  if (typeof m.codeHint === "string") parts.push(`kode …${m.codeHint}`);
  if (typeof m.oldHint === "string" && typeof m.newHint === "string") parts.push(`…${m.oldHint} → …${m.newHint}`);
  if (typeof m.plan === "string") parts.push(`paket ${m.plan}`);
  if (typeof m.slug === "string") parts.push(`paket ${m.slug}`);
  if (typeof m.reason === "string") parts.push(`alasan: ${m.reason}`);
  if (typeof m.email === "string") parts.push(m.email);
  const after = m.after as { priceIdr?: number; durationDays?: number } | undefined;
  if (after?.priceIdr !== undefined) parts.push(`${formatRupiah(after.priceIdr)}, ${after.durationDays} hari`);

  return (
    <>
      {parts.length > 0 && <span className="text-fg-muted"> · {parts.join(" · ")}</span>}
      {row.targetType === "order" && row.targetId && (
        <>
          {" "}
          <Link to={`/super-admin/pesanan/${row.targetId}`} className="font-medium text-primary-text underline-offset-4 hover:underline">
            Lihat pesanan
          </Link>
        </>
      )}
    </>
  );
}
