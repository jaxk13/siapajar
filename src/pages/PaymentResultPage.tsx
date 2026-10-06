import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Clock, Loader2, MailCheck, MessageCircle, XCircle } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import Alert from "../components/ui/Alert";
import { buttonClasses } from "../components/ui/Button";
import { fetchCheckoutStatus, recallPaymentUrl, type CheckoutStatus } from "../features/checkout/checkoutService";
import { fetchPlans, formatRupiah, whatsappLink, type AdminContact } from "../features/plans/plansService";
import { trackPurchaseOnce, useMetaPixel } from "../features/tracking/metaPixel";
import { Link, usePageTitle } from "../lib/router";

// Shown after the Midtrans popup closes or Midtrans redirects back (ADR-017).
// The page only reads the status; the server confirms payments with Midtrans.

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error"; message: string } | { kind: "ready"; data: CheckoutStatus };

/** Polls fast at first, then slower; stops after 30 minutes. */
function nextDelay(elapsedMs: number): number | null {
  if (elapsedMs < 2 * 60_000) return 4_000;
  if (elapsedMs < 30 * 60_000) return 15_000;
  return null;
}

function readOrderId(): string | null {
  const query = new URLSearchParams(window.location.search);
  // "order" is ours; Midtrans adds "order_id" when it redirects back.
  return query.get("order") || query.get("order_id");
}

export default function PaymentResultPage() {
  usePageTitle("Status Pembayaran");
  useMetaPixel();
  const [orderId] = useState(readOrderId);
  const [state, setState] = useState<State>(orderId ? { kind: "loading" } : { kind: "missing" });
  const [contact, setContact] = useState<AdminContact | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    fetchPlans().then((data) => setContact(data?.contact ?? null));
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const result = await fetchCheckoutStatus(orderId);
      if (cancelled) return;
      if (!result.ok) {
        setState(result.status === 404 ? { kind: "missing" } : { kind: "error", message: result.message });
        if (result.status === 404) return;
      } else {
        setState({ kind: "ready", data: result.data });
        const done = result.data.status !== "pending" && !(result.data.status === "paid" && !result.data.emailSent);
        if (done) return;
      }
      const delay = nextDelay(Date.now() - startedAt.current);
      if (delay !== null) timer = setTimeout(poll, delay);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  // Browser half of the Purchase event; the server sends the same event id.
  useEffect(() => {
    if (state.kind === "ready" && state.data.status === "paid" && orderId) {
      trackPurchaseOnce(orderId, {
        value: state.data.amountIdr,
        currency: "IDR",
        content_name: state.data.planName,
        content_ids: [state.data.planSlug],
        content_type: "product",
      });
    }
  }, [state, orderId]);

  return (
    <AuthLayout>
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8" aria-live="polite">
        {state.kind === "loading" && (
          <div className="flex flex-col items-center py-6 text-center" role="status">
            <Loader2 className="size-8 animate-spin text-fg-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm text-fg-muted">Memeriksa status pembayaran…</p>
          </div>
        )}

        {state.kind === "missing" && (
          <Result icon={<XCircle className="size-10 text-fg-subtle" aria-hidden="true" />} title="Pesanan tidak ditemukan">
            <p>Tautan ini tidak memuat pesanan yang valid. Jika Anda sudah membayar, periksa email Anda atau hubungi admin.</p>
            <Actions contact={contact} primary={{ to: "/#harga", label: "Lihat paket" }} />
          </Result>
        )}

        {state.kind === "error" && (
          <Result icon={<XCircle className="size-10 text-danger" aria-hidden="true" />} title="Status belum dapat dimuat">
            <Alert tone="danger" title={state.message} />
            <button type="button" onClick={() => window.location.reload()} className={buttonClasses("secondary", "md", "mt-4 w-full")}>
              Muat ulang
            </button>
          </Result>
        )}

        {state.kind === "ready" && <StatusView data={state.data} orderId={orderId!} contact={contact} />}
      </div>
    </AuthLayout>
  );
}

function StatusView({ data, orderId, contact }: { data: CheckoutStatus; orderId: string; contact: AdminContact | null }) {
  const summary = `Paket ${data.planName} · ${formatRupiah(data.amountIdr)}`;

  if (data.status === "paid" && data.emailSent) {
    return (
      <Result icon={<CheckCircle2 className="size-12 text-success" aria-hidden="true" />} title="Pembayaran berhasil!" summary={summary}>
        <div className="flex items-start gap-3 rounded-md bg-primary-soft px-3.5 py-3 text-left text-sm text-primary-text">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Kode akses sudah dikirim ke <span className="font-semibold">{data.emailHint}</span>. Jika belum terlihat, periksa folder Spam atau
            Promosi.
          </p>
        </div>
        <Link to="/masuk" className={buttonClasses("primary", "lg", "mt-5 w-full")}>
          Masuk dengan kode akses
        </Link>
        <HelpLink contact={contact} message={`Halo Admin SIAPAJAR, saya sudah membayar paket ${data.planName} tetapi belum menerima email kode akses.`} />
      </Result>
    );
  }

  if (data.status === "paid") {
    return (
      <Result icon={<CheckCircle2 className="size-12 text-success" aria-hidden="true" />} title="Pembayaran berhasil!" summary={summary}>
        <p>Kode akses sedang dikirim ke {data.emailHint ?? "email Anda"}. Halaman ini akan diperbarui otomatis.</p>
        <p className="mt-2">Jika email belum masuk dalam 15 menit, hubungi admin. Pembayaran Anda sudah tercatat.</p>
        <HelpLink contact={contact} message={`Halo Admin SIAPAJAR, saya sudah membayar paket ${data.planName} tetapi belum menerima email kode akses.`} />
      </Result>
    );
  }

  if (data.status === "pending") {
    const paymentUrl = recallPaymentUrl(orderId);
    return (
      <Result icon={<Clock className="size-12 text-primary-text" aria-hidden="true" />} title="Menunggu pembayaran" summary={summary}>
        <p>Selesaikan pembayaran sesuai petunjuk dari Midtrans. Halaman ini diperbarui otomatis setelah pembayaran diterima.</p>
        <p className="mt-2">Kode akses dikirim ke {data.emailHint ?? "email Anda"} begitu pembayaran berhasil.</p>
        {paymentUrl && (
          <a href={paymentUrl} className={buttonClasses("primary", "lg", "mt-5 w-full")}>
            Lanjutkan pembayaran
          </a>
        )}
        <HelpLink contact={contact} message={`Halo Admin SIAPAJAR, saya mengalami kendala saat membayar paket ${data.planName}.`} />
      </Result>
    );
  }

  return (
    <Result
      icon={<XCircle className="size-12 text-danger" aria-hidden="true" />}
      title={data.status === "expired" ? "Batas waktu pembayaran habis" : "Pembayaran tidak berhasil"}
      summary={summary}
    >
      <p>Tidak ada dana yang ditagihkan untuk pesanan ini. Silakan pilih paket lagi untuk membuat pembayaran baru.</p>
      <Actions contact={contact} primary={{ to: "/#harga", label: "Pilih paket lagi" }} />
    </Result>
  );
}

function Result({ icon, title, summary, children }: { icon: ReactNode; title: string; summary?: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex justify-center">{icon}</div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-fg">{title}</h1>
      {summary && <p className="mt-1 text-sm font-medium text-fg-subtle">{summary}</p>}
      <div className="mt-4 text-sm text-fg-muted">{children}</div>
    </div>
  );
}

function Actions({ contact, primary }: { contact: AdminContact | null; primary: { to: string; label: string } }) {
  return (
    <>
      <Link to={primary.to} className={buttonClasses("primary", "lg", "mt-5 w-full")}>
        {primary.label}
      </Link>
      <HelpLink contact={contact} message="Halo Admin SIAPAJAR, saya butuh bantuan terkait pembayaran." />
    </>
  );
}

function HelpLink({ contact, message }: { contact: AdminContact | null; message: string }) {
  if (!contact) return null;
  return (
    <a
      href={whatsappLink(contact, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      Hubungi admin
      <span className="sr-only">(WhatsApp, membuka tab baru)</span>
    </a>
  );
}
