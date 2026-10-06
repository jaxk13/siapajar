import { useState } from "react";
import { ArrowLeft, BellRing, ExternalLink, MessageCircle, Smartphone } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import { buttonClasses } from "../../components/ui/Button";
import { adminApi } from "../../features/admin/adminApi";
import { useAdminQuery } from "../../features/admin/AdminProvider";
import CodeActions from "../../features/admin/CodeActions";
import { CodeStatusBadge, ErrorBlock, Field, LoadingBlock, Panel } from "../../features/admin/components";
import {
  DELIVERY_STATUS,
  deviceLabel,
  formatDate,
  formatDateTime,
  formatRupiah,
  formatWhatsapp,
  ORDER_STATUS,
  PAYMENT_LABELS,
} from "../../features/admin/format";
import ResendEmailButton from "../../features/admin/ResendEmailButton";
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold tracking-tight text-fg">{data.order.buyerName}</h1>
                  <Badge tone={ORDER_STATUS[data.order.status].tone}>{ORDER_STATUS[data.order.status].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-fg-muted">
                  {data.order.planName} · {formatRupiah(data.order.amountIdr)} · {formatDateTime(data.order.createdAt)}
                </p>
              </div>
              {data.order.reminderWhatsappUrl ? (
                <a href={data.order.reminderWhatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>
                  <BellRing className="size-4" aria-hidden="true" />
                  Ingatkan via WhatsApp
                </a>
              ) : (
                <a href={data.order.buyerWhatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Chat pembeli
                </a>
              )}
            </div>

            {data.order.status === "paid" && (
              <Alert tone="danger" title="Pembayaran sudah diterima, tetapi kode akses belum terkirim.">
                Kirim ulang lewat email (bisa sekaligus memperbaiki alamat email), atau gunakan Ganti kode lalu kirim lewat WhatsApp.
              </Alert>
            )}
            {data.order.status === "pending" && (
              <Alert tone="info" title="Checkout ini belum dibayar.">
                Kode akses dibuat dan dikirim otomatis begitu Midtrans mengonfirmasi pembayaran. Gunakan tombol Ingatkan via WhatsApp untuk
                menindaklanjuti.
              </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <Panel
                  title="Kode akses"
                  actions={
                    data.code && (
                      <div className="flex flex-wrap gap-2">
                        {(data.code.status === "unused" || data.code.status === "active") && (
                          <ResendEmailButton
                            orderId={data.order.id}
                            currentEmail={data.order.buyerEmail}
                            codeActive={data.code.status === "active"}
                            onDone={reload}
                          />
                        )}
                        <CodeActions code={data.code} onChanged={reload} />
                      </div>
                    )
                  }
                >
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
                    <p className="text-sm text-fg-muted">
                      {data.order.status === "pending"
                        ? "Kode akses dibuat otomatis setelah pembayaran berhasil."
                        : "Pesanan ini belum memiliki kode akses."}
                    </p>
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

                {(data.deliveries.length > 0 || data.order.buyerEmail) && (
                  <Panel title="Pengiriman kode lewat email">
                    {data.deliveries.length === 0 ? (
                      <p className="text-sm text-fg-muted">Belum ada pengiriman.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {data.deliveries.map((d) => (
                          <li key={d.id} className="flex flex-col gap-0.5 py-2.5 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-3">
                            <span className={`font-semibold ${d.status === "sent" ? "text-success" : "text-danger"}`}>{DELIVERY_STATUS[d.status]}</span>
                            <span className="text-fg-subtle">
                              {formatDateTime(d.createdAt)} · {d.createdByName ?? "otomatis"}
                            </span>
                            {d.error && <span className="text-fg-subtle">{d.error}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                )}
              </div>

              <div className="space-y-6">
                <Panel title="Pembeli & pembayaran">
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Nama">{data.order.buyerName}</Field>
                    <Field label="WhatsApp">{formatWhatsapp(data.order.buyerWhatsapp)}</Field>
                    <div className="col-span-2">
                      <Field label="Email">
                        <span className="break-all">{data.order.buyerEmail ?? "-"}</span>
                      </Field>
                    </div>
                    <Field label="Metode">{data.order.paymentMethod ? PAYMENT_LABELS[data.order.paymentMethod] : "-"}</Field>
                    <Field label="Referensi">
                      <span className="break-all">{data.order.paymentReference ?? "-"}</span>
                    </Field>
                    <Field label="Dicatat oleh">
                      {data.order.provider === "midtrans" ? "Otomatis (Midtrans)" : data.order.createdByName ?? "CLI server"}
                    </Field>
                    <Field label="Dibayar">{formatDateTime(data.order.paidAt)}</Field>
                    {data.order.note && (
                      <div className="col-span-2">
                        <Field label="Catatan">{data.order.note}</Field>
                      </div>
                    )}
                  </dl>
                </Panel>

                <Panel title="Sumber pembeli">
                  {data.order.attribution.source || data.order.attribution.campaign || data.order.attribution.fromMetaAd ? (
                    <dl className="grid grid-cols-2 gap-4">
                      <Field label="Sumber">{data.order.attribution.source ?? (data.order.attribution.fromMetaAd ? "Iklan Meta" : "-")}</Field>
                      <Field label="Medium">{data.order.attribution.medium ?? "-"}</Field>
                      <div className="col-span-2">
                        <Field label="Kampanye">{data.order.attribution.campaign ?? "-"}</Field>
                      </div>
                      {data.order.attribution.content && (
                        <div className="col-span-2">
                          <Field label="Konten iklan">{data.order.attribution.content}</Field>
                        </div>
                      )}
                      {data.order.attribution.fromMetaAd && (
                        <div className="col-span-2">
                          <Badge tone="brand">Datang dari klik iklan Meta</Badge>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      {data.order.provider === "midtrans"
                        ? "Tidak ada data sumber. Pembeli datang tanpa tautan iklan (utm) atau langsung membuka situs."
                        : "Pesanan dicatat manual oleh admin."}
                    </p>
                  )}
                </Panel>

                {data.order.provider !== "midtrans" && (
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
