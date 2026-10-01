import { useState } from "react";
import { ArrowLeft, ExternalLink, MessageCircle, Smartphone } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import { buttonClasses } from "../../components/ui/Button";
import { adminApi } from "../../features/admin/adminApi";
import { useAdminQuery } from "../../features/admin/AdminProvider";
import CodeActions from "../../features/admin/CodeActions";
import { CodeStatusBadge, ErrorBlock, Field, LoadingBlock, Panel } from "../../features/admin/components";
import { deviceLabel, formatDate, formatDateTime, formatRupiah, formatWhatsapp, PAYMENT_LABELS } from "../../features/admin/format";
import { Link, usePageTitle } from "../../lib/router";

export default function OrderDetailPage({ id }: { id: string }) {
  usePageTitle("Detail Pesanan");
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.order(id), [id]);
  const [proofIsImage, setProofIsImage] = useState(true);

  return (
    <AdminShell title="Detail Pesanan">
      <div className="space-y-6">
        <Link to="/super-admin/pesanan" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Semua pesanan
        </Link>

        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}

        {data && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-fg">{data.order.buyerName}</h1>
                <p className="mt-1 text-sm text-fg-muted">
                  {data.order.planName} · {formatRupiah(data.order.amountIdr)} · {formatDateTime(data.order.createdAt)}
                </p>
              </div>
              <a href={data.order.buyerWhatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
                <MessageCircle className="size-4" aria-hidden="true" />
                Chat pembeli
              </a>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <Panel title="Kode akses" actions={data.code && <CodeActions code={data.code} onChanged={reload} />}>
                  {data.code ? (
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Field label="Kode">
                        <span className="font-mono">…{data.code.hint}</span>
                      </Field>
                      <Field label="Status">
                        <CodeStatusBadge status={data.code.status} />
                      </Field>
                      <Field label="Perangkat aktif">
                        {data.code.activeDevices} / {data.code.maxDevices ?? "∞"}
                      </Field>
                      <Field label="Mulai dipakai">{formatDateTime(data.code.activatedAt)}</Field>
                      <Field label="Berakhir">{data.code.expiresAt ? formatDate(data.code.expiresAt) : `${data.code.durationDays} hari sejak dipakai`}</Field>
                      {data.code.disabledReason && <Field label="Alasan nonaktif">{data.code.disabledReason}</Field>}
                    </dl>
                  ) : (
                    <p className="text-sm text-fg-muted">Pesanan ini belum memiliki kode akses.</p>
                  )}
                  <p className="mt-4 text-xs text-fg-subtle">
                    Kode lengkap tidak disimpan. Jika pembeli kehilangan kodenya, gunakan <span className="font-semibold">Ganti kode</span>.
                  </p>
                </Panel>

                <Panel title="Perangkat yang sedang masuk">
                  {data.devices.length === 0 ? (
                    <p className="text-sm text-fg-muted">Belum ada perangkat yang masuk dengan kode ini.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {data.devices.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                          <Smartphone className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                          <div className="min-w-0 text-sm">
                            <p className="truncate font-medium text-fg">{deviceLabel(d.userAgent)}</p>
                            <p className="text-fg-subtle">Terakhir aktif {formatDateTime(d.lastSeenAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <div className="space-y-6">
                <Panel title="Pembeli & pembayaran">
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Nama">{data.order.buyerName}</Field>
                    <Field label="WhatsApp">{formatWhatsapp(data.order.buyerWhatsapp)}</Field>
                    <Field label="Metode">{data.order.paymentMethod ? PAYMENT_LABELS[data.order.paymentMethod] : "-"}</Field>
                    <Field label="Referensi">{data.order.paymentReference ?? "-"}</Field>
                    <Field label="Dicatat oleh">{data.order.createdByName ?? "CLI server"}</Field>
                    <Field label="Tanggal">{formatDateTime(data.order.createdAt)}</Field>
                    {data.order.note && (
                      <div className="col-span-2">
                        <Field label="Catatan">{data.order.note}</Field>
                      </div>
                    )}
                  </dl>
                </Panel>

                <Panel
                  title="Bukti transaksi"
                  actions={
                    data.order.hasProof && (
                      <a
                        href={adminApi.orderProofUrl(data.order.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
                      >
                        Buka
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )
                  }
                >
                  {!data.order.hasProof ? (
                    <p className="text-sm text-fg-muted">Tidak ada bukti transaksi.</p>
                  ) : proofIsImage ? (
                    <img
                      src={adminApi.orderProofUrl(data.order.id)}
                      alt={`Bukti transaksi ${data.order.buyerName}`}
                      onError={() => setProofIsImage(false)}
                      className="max-h-96 w-full rounded-md border border-line object-contain"
                    />
                  ) : (
                    <p className="text-sm text-fg-muted">Bukti berupa PDF. Pilih “Buka” untuk melihatnya.</p>
                  )}
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
