import { useRef, useState, type FormEvent } from "react";
import { Lock, Mail } from "lucide-react";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { useRouter } from "../../lib/router";
import { formatRupiah, type Plan } from "../plans/plansService";
import { getAttribution } from "../tracking/attribution";
import { trackPixel } from "../tracking/metaPixel";
import { createCheckout, loadSnap, rememberPaymentUrl, type CheckoutConfig } from "./checkoutService";

interface CheckoutDialogProps {
  plan: Plan | null;
  config: CheckoutConfig;
  onClose: () => void;
}

type Errors = Partial<Record<"name" | "email" | "whatsapp" | "consent", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: { name: string; email: string; whatsapp: string; consent: boolean }): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Isi nama lengkap Anda.";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Isi alamat email yang valid. Kode akses dikirim ke email ini.";
  const digits = values.whatsapp.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) errors.whatsapp = "Isi nomor WhatsApp yang valid, misalnya 081234567890.";
  if (!values.consent) errors.consent = "Centang persetujuan untuk melanjutkan.";
  return errors;
}

/** Collects buyer details, creates the order, then hands over to the Midtrans payment popup. */
export default function CheckoutDialog({ plan, config, onClose }: CheckoutDialogProps) {
  const { navigate } = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setFormError(undefined);
    const found = validate({ name, email, whatsapp, consent });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      formRef.current?.querySelector<HTMLElement>(`#checkout-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    const result = await createCheckout({
      planSlug: plan.slug,
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      consent,
      attribution: getAttribution(),
    });
    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.message);
      return;
    }

    const order = result.data;
    rememberPaymentUrl(order.orderId, order.redirectUrl);
    trackPixel(
      "InitiateCheckout",
      { value: order.amountIdr, currency: "IDR", content_name: order.planName, content_ids: [order.planSlug], content_type: "product" },
      `checkout-${order.orderId}`
    );

    const resultPath = `/pembayaran/selesai?order=${order.orderId}`;
    const snapReady = await loadSnap(config);
    setSubmitting(false);
    if (!snapReady || !window.snap) {
      // Popup script blocked or unreachable: continue on Midtrans' hosted payment page.
      window.location.assign(order.redirectUrl);
      return;
    }
    // The native <dialog> sits in the top layer and would cover the Midtrans popup, so close it first.
    onClose();
    window.snap.pay(order.snapToken, {
      onSuccess: () => navigate(resultPath),
      onPending: () => navigate(resultPath),
      onError: () => navigate(resultPath),
      onClose: () => navigate(resultPath),
    });
  };

  return (
    <Dialog
      open={plan !== null}
      title={plan ? `Beli paket ${plan.name}` : "Beli paket"}
      description={plan ? `${formatRupiah(plan.priceIdr)} · masa aktif ${plan.durationDays} hari` : undefined}
      onClose={() => {
        if (!submitting) onClose();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" form="checkout-form" loading={submitting} loadingText="Menyiapkan pembayaran…" icon={<Lock className="size-4" aria-hidden="true" />}>
            Lanjut ke pembayaran
          </Button>
        </>
      }
    >
      <form id="checkout-form" ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="danger" title={formError} />}

        <div className="flex items-start gap-3 rounded-md bg-primary-soft px-3.5 py-3 text-sm text-primary-text">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Setelah pembayaran berhasil, kode akses langsung dikirim ke email Anda.</p>
        </div>

        <FormField id="checkout-name" label="Nama lengkap" error={errors.name}>
          {(control) => (
            <Input {...control} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
          )}
        </FormField>

        <FormField id="checkout-email" label="Email" hint="Pastikan benar. Kode akses dikirim ke alamat ini." error={errors.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
            />
          )}
        </FormField>

        <FormField id="checkout-whatsapp" label="Nomor WhatsApp" hint="Untuk bantuan jika ada kendala pembayaran." error={errors.whatsapp}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081234567890"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              maxLength={20}
            />
          )}
        </FormField>

        <div className="space-y-1.5">
          <label htmlFor="checkout-consent" className="flex cursor-pointer items-start gap-3 text-sm text-fg-muted">
            <input
              id="checkout-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "checkout-consent-error" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              Saya setuju data di atas digunakan untuk memproses pesanan, mengirim kode akses, menghubungi saya terkait pesanan ini, dan
              mengukur iklan, sesuai{" "}
              <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-text underline underline-offset-2">
                Kebijakan Privasi
              </a>
              .
            </span>
          </label>
          {errors.consent && (
            <p id="checkout-consent-error" className="text-sm text-danger">
              {errors.consent}
            </p>
          )}
        </div>

        <p className="text-xs text-fg-subtle">Pembayaran diproses oleh Midtrans: QRIS, virtual account bank, atau e-wallet.</p>
      </form>
    </Dialog>
  );
}
