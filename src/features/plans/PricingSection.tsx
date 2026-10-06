import { useEffect, useRef, useState } from "react";
import { Check, Lock, MessageCircle } from "lucide-react";
import Button, { buttonClasses } from "../../components/ui/Button";
import Container from "../../components/ui/Container";
import CheckoutDialog from "../checkout/CheckoutDialog";
import { getCheckoutConfig, type CheckoutConfig } from "../checkout/checkoutService";
import { trackPixel } from "../tracking/metaPixel";
import { fetchPlans, formatRupiah, formatWhatsapp, whatsappLink, type AdminContact, type Plan, type PlansData } from "./plansService";

// Content follows docs/PRD.md §21 (FR-P01, FR-P02, FR-P04, FR-P06).

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: PlansData };

const MANUAL_STEPS = [
  "Pilih paket, lalu hubungi admin lewat WhatsApp.",
  "Bayar melalui transfer bank atau QRIS, lalu kirim bukti pembayaran.",
  "Setelah pembayaran diverifikasi, admin mengirim kode akses lewat WhatsApp.",
  "Masuk ke SIAPAJAR dengan kode akses tersebut.",
];

const AUTOMATIC_STEPS = [
  "Pilih paket, lalu isi nama, email, dan nomor WhatsApp.",
  "Bayar lewat QRIS, virtual account bank, atau e-wallet.",
  "Kode akses langsung dikirim ke email Anda setelah pembayaran berhasil.",
  "Masuk ke SIAPAJAR dengan kode akses tersebut.",
];

export default function PricingSection() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [checkout, setCheckout] = useState<CheckoutConfig | null>(null);
  const [buying, setBuying] = useState<Plan | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPlans(), getCheckoutConfig()]).then(([data, config]) => {
      if (cancelled) return;
      setState(data ? { status: "ready", data } : { status: "error" });
      setCheckout(config?.enabled ? config : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Meta "ViewContent": the visitor actually saw the prices.
  const plans = state.status === "ready" ? state.data.plans : [];
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || plans.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackPixel("ViewContent", { content_name: "Harga", content_ids: plans.map((p) => p.slug), content_type: "product", currency: "IDR" });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [plans]);

  const contact = state.status === "ready" ? state.data.contact : null;
  const steps = checkout ? AUTOMATIC_STEPS : MANUAL_STEPS;

  return (
    <section ref={sectionRef} id="harga" aria-labelledby="harga-title" className="border-t border-line bg-surface py-16 md:py-24">
      <Container>
        <div className="max-w-2xl">
          <h2 id="harga-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Harga
          </h2>
          <p className="mt-3 text-base text-fg-muted">
            Semua paket berisi fitur yang sama. Perbedaannya hanya masa aktif kode akses.
          </p>
        </div>

        <div className="mt-10" aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "loading" && <p className="text-sm text-fg-subtle">Memuat informasi harga…</p>}

          {state.status === "error" && (
            <p className="text-sm text-fg-muted">
              Informasi harga belum dapat dimuat. Silakan muat ulang halaman ini beberapa saat lagi.
            </p>
          )}

          {state.status === "ready" && state.data.plans.length > 0 && (
            <ul className="grid gap-6 md:grid-cols-2 lg:max-w-4xl">
              {state.data.plans.map((plan) => (
                <li key={plan.slug}>
                  <PlanCard plan={plan} contact={contact} canCheckout={checkout !== null} onBuy={() => setBuying(plan)} />
                </li>
              ))}
            </ul>
          )}

          {state.status === "ready" && state.data.plans.length === 0 && (
            <div className="rounded-lg border border-line bg-canvas px-5 py-5 lg:max-w-4xl">
              <p className="text-base font-semibold text-fg">Informasi harga segera tersedia.</p>
              <p className="mt-1 text-sm text-fg-muted">
                {contact
                  ? "Untuk harga dan pembelian saat ini, silakan hubungi admin lewat WhatsApp."
                  : "Silakan kembali lagi nanti untuk melihat pilihan paket."}
              </p>
              {contact && (
                <a
                  href={whatsappLink(contact, "Halo Admin SIAPAJAR, saya ingin menanyakan harga paket SIAPAJAR.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("primary", "md", "mt-4")}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Tanya Harga via WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        <div id="kode-akses" className="mt-14 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            <h3 className="text-lg font-semibold text-fg">Cara mendapatkan kode akses</h3>
            <ol className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-fg-muted">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded border border-line-strong text-xs font-semibold tabular-nums text-primary-text"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">
                    <span className="sr-only">Langkah {index + 1}: </span>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-fg-subtle">
              Tanpa registrasi akun. Setiap pembeli mendapat kode akses yang berbeda.
            </p>
          </div>

          <div className="rounded-lg bg-primary-soft px-5 py-5">
            <h3 className="text-base font-semibold text-fg">Ada pertanyaan?</h3>
            <p className="mt-1 text-sm text-fg-muted">
              {checkout
                ? "Admin melayani pertanyaan seputar SIAPAJAR dan kendala pembayaran lewat WhatsApp."
                : "Admin melayani pertanyaan seputar SIAPAJAR dan verifikasi pembayaran lewat WhatsApp."}
            </p>
            {contact ? (
              <a
                href={whatsappLink(contact, "Halo Admin SIAPAJAR, saya ingin bertanya.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-primary-text underline-offset-4 hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {formatWhatsapp(contact.whatsappNumber)}
                <span className="sr-only">(WhatsApp, membuka tab baru)</span>
              </a>
            ) : (
              <p className="mt-3 text-sm text-fg-subtle">Nomor WhatsApp admin akan segera tersedia.</p>
            )}
          </div>
        </div>
      </Container>
      {checkout && <CheckoutDialog plan={buying} config={checkout} onClose={() => setBuying(null)} />}
    </section>
  );
}

interface PlanCardProps {
  plan: Plan;
  contact: AdminContact | null;
  canCheckout: boolean;
  onBuy: () => void;
}

function PlanCard({ plan, contact, canCheckout, onBuy }: PlanCardProps) {
  const details = [
    `Masa aktif ${plan.durationDays} hari, dihitung sejak kode pertama kali dipakai`,
    plan.maxDevices === null ? "Dapat digunakan di banyak perangkat" : `Dapat digunakan di maksimal ${plan.maxDevices} perangkat`,
    "Naskah soal, kisi-kisi, kunci jawaban, kop sekolah",
    "Ekspor Word dan Print/PDF",
  ];
  const message = `Halo Admin SIAPAJAR, saya ingin membeli paket ${plan.name} (${formatRupiah(plan.priceIdr)}).`;

  return (
    <article aria-labelledby={`plan-${plan.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-surface p-6 shadow-card">
      <h3 id={`plan-${plan.slug}`} className="text-lg font-semibold text-fg">
        {plan.name}
      </h3>
      {plan.description && <p className="mt-1 text-sm text-fg-muted">{plan.description}</p>}

      <p className="mt-5 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums text-fg">{formatRupiah(plan.priceIdr)}</span>
        <span className="text-sm text-fg-subtle">/ {plan.durationDays} hari</span>
      </p>

      <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-5">
        {details.map((detail) => (
          <li key={detail} className="flex gap-2.5 text-sm text-fg-muted">
            <Check className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>

      {canCheckout ? (
        <div className="mt-6 space-y-2">
          <Button size="lg" className="w-full" onClick={onBuy} icon={<Lock className="size-4" aria-hidden="true" />}>
            Beli Sekarang
            <span className="sr-only">, paket {plan.name}</span>
          </Button>
          {contact && (
            <a
              href={whatsappLink(contact, `Halo Admin SIAPAJAR, saya ingin bertanya tentang paket ${plan.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-1 text-sm font-medium text-fg-muted hover:text-fg"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Tanya admin dulu
              <span className="sr-only">(WhatsApp, membuka tab baru)</span>
            </a>
          )}
        </div>
      ) : contact ? (
        <a
          href={whatsappLink(contact, message)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("primary", "lg", "mt-6 w-full")}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Beli via WhatsApp
          <span className="sr-only">, paket {plan.name} (membuka tab baru)</span>
        </a>
      ) : (
        <p className="mt-6 rounded-md bg-subtle px-3 py-2.5 text-center text-sm text-fg-muted">
          Pembelian segera dibuka.
        </p>
      )}
    </article>
  );
}
