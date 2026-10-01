import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Button, { buttonClasses } from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import { adminApi, type IssuedCode, type PaymentMethod } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, IssuedCodePanel, LoadingBlock, Panel } from "../../features/admin/components";
import { formatRupiah, readFileAsBase64 } from "../../features/admin/format";
import { Link, usePageTitle } from "../../lib/router";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type Errors = Partial<Record<"planId" | "buyerName" | "buyerWhatsapp" | "proof" | "form", string>>;

export default function OrderCreatePage() {
  usePageTitle("Buat Pesanan");
  const { handleAuthError } = useAdmin();
  const plans = useAdminQuery(() => adminApi.plans(), []);

  const [planId, setPlanId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  // Preselect the first active plan.
  useEffect(() => {
    if (!planId && plans.data?.plans.length) {
      setPlanId((plans.data.plans.find((p) => p.isActive) ?? plans.data.plans[0]).id);
    }
  }, [plans.data, planId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const selectedPlan = plans.data?.plans.find((p) => p.id === planId);

  /** Updates a field and clears its error as soon as the admin edits it. */
  const edit = (key: keyof Errors, setter: (value: string) => void) => (value: string) => {
    setter(value);
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const onProofChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (!PROOF_TYPES.includes(file.type)) {
      setErrors((x) => ({ ...x, proof: "Bukti transaksi harus berupa foto (JPG, PNG, WEBP) atau PDF." }));
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setErrors((x) => ({ ...x, proof: "Ukuran bukti transaksi maksimal 5 MB." }));
      return;
    }
    setErrors((x) => ({ ...x, proof: undefined }));
    setProof(file);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const reset = () => {
    setBuyerName("");
    setBuyerWhatsapp("");
    setPaymentReference("");
    setNote("");
    setProof(null);
    setPreview(null);
    setIssued(null);
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!planId) found.planId = "Pilih paket.";
    if (!buyerName.trim()) found.buyerName = "Masukkan nama pembeli.";
    if (buyerWhatsapp.replace(/\D/g, "").length < 9) found.buyerWhatsapp = "Masukkan nomor WhatsApp pembeli. Contoh: 081234567890";
    if (!proof) found.proof = "Unggah bukti transaksi.";
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`order-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    const result = await adminApi.createOrder({
      planId,
      buyerName: buyerName.trim(),
      buyerWhatsapp: buyerWhatsapp.trim(),
      paymentMethod,
      paymentReference: paymentReference.trim(),
      note: note.trim(),
      proof: { dataBase64: await readFileAsBase64(proof!) },
    });
    setSubmitting(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setErrors({ form: result.message });
      window.scrollTo(0, 0);
      return;
    }
    setIssued(result.data.issued);
    window.scrollTo(0, 0);
  };

  if (issued) {
    return (
      <AdminShell title="Pesanan berhasil dibuat">
        <div className="max-w-2xl space-y-6">
          <Alert tone="success" title={`Pesanan ${buyerName} tersimpan dan kode akses sudah dibuat.`} />
          <Panel>
            <IssuedCodePanel issued={issued} />
          </Panel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={`/super-admin/pesanan/${issued.orderId}`} className={buttonClasses("secondary", "md")}>
              Lihat detail pesanan
            </Link>
            <Button variant="ghost" onClick={reset}>
              Buat pesanan lain
            </Button>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Buat Pesanan">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Buat pesanan</h1>
          <p className="mt-1 text-sm text-fg-muted">Isi setelah pembayaran pembeli diverifikasi. Kode akses dibuat otomatis.</p>
        </div>

        {plans.loading && !plans.data && <LoadingBlock label="Memuat paket…" />}
        {plans.error && <ErrorBlock message={plans.error} onRetry={plans.reload} />}

        {plans.data && (
          <form onSubmit={submit} noValidate className="space-y-6">
            {errors.form && <Alert tone="danger" title={errors.form} />}

            <Panel title="Paket">
              <FormField id="order-planId" label="Paket yang dibeli" error={errors.planId}>
                {(c) => (
                  <Select {...c} value={planId} onChange={(e) => edit("planId", setPlanId)(e.target.value)}>
                    {plans.data!.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatRupiah(p.priceIdr)} · {p.durationDays} hari{p.isActive ? "" : " (tidak tampil di halaman harga)"}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </Panel>

            <Panel title="Pembeli">
              <div className="space-y-5">
                <FormField id="order-buyerName" label="Nama pembeli" error={errors.buyerName}>
                  {(c) => <Input {...c} autoComplete="off" value={buyerName} onChange={(e) => edit("buyerName", setBuyerName)(e.target.value)} maxLength={150} />}
                </FormField>
                <FormField id="order-buyerWhatsapp" label="Nomor WhatsApp" hint="Contoh: 081234567890. Kode akan dikirim ke nomor ini." error={errors.buyerWhatsapp}>
                  {(c) => <Input {...c} type="tel" inputMode="tel" autoComplete="off" value={buyerWhatsapp} onChange={(e) => edit("buyerWhatsapp", setBuyerWhatsapp)(e.target.value)} maxLength={20} />}
                </FormField>
              </div>
            </Panel>

            <Panel title="Pembayaran">
              <div className="space-y-5">
                <fieldset>
                  <legend className="text-sm font-semibold text-fg">Metode pembayaran</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      ["bank_transfer", "Transfer bank"],
                      ["qris", "QRIS"],
                    ] as const).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                          paymentMethod === value ? "border-primary bg-primary-soft text-primary-text" : "border-line-strong text-fg hover:bg-subtle"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={value}
                          checked={paymentMethod === value}
                          onChange={() => setPaymentMethod(value)}
                          className="size-4 accent-[var(--sa-primary)]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <FormField id="order-reference" label="Nomor referensi" optional hint="Nomor transaksi dari bank atau aplikasi pembayaran, jika ada.">
                  {(c) => <Input {...c} autoComplete="off" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} maxLength={100} />}
                </FormField>

                <div className="space-y-1.5">
                  <p id="order-proof-label" className="text-sm font-semibold text-fg">
                    Bukti transaksi
                  </p>
                  {proof ? (
                    <div className="flex items-center gap-3 rounded-md border border-line bg-canvas p-3">
                      {preview ? (
                        <img src={preview} alt="Pratinjau bukti transaksi" className="size-16 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded bg-subtle text-fg-muted">
                          <FileText className="size-6" aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{proof.name}</p>
                        <p className="text-xs text-fg-subtle">{(proof.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setProof(null); setPreview(null); }} aria-label="Hapus file bukti transaksi">
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="order-proof"
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors hover:bg-subtle ${
                        errors.proof ? "border-danger" : "border-line-strong"
                      }`}
                    >
                      <Upload className="size-6 text-fg-subtle" aria-hidden="true" />
                      <span className="text-sm font-semibold text-primary-text">Pilih foto atau file</span>
                      <span className="text-xs text-fg-subtle">JPG, PNG, WEBP, atau PDF · maksimal 5 MB</span>
                    </label>
                  )}
                  <input
                    id="order-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={onProofChange}
                    className="sr-only"
                    aria-labelledby="order-proof-label"
                    aria-describedby={errors.proof ? "order-proof-error" : undefined}
                  />
                  {errors.proof && (
                    <p id="order-proof-error" className="text-sm text-danger">
                      {errors.proof}
                    </p>
                  )}
                </div>

                <FormField id="order-note" label="Catatan" optional>
                  {(c) => <Textarea {...c} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />}
                </FormField>
              </div>
            </Panel>

            <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-fg-muted">
                {selectedPlan ? (
                  <>
                    Paket <span className="font-semibold text-fg">{selectedPlan.name}</span> ·{" "}
                    <span className="font-semibold tabular-nums text-fg">{formatRupiah(selectedPlan.priceIdr)}</span> · {selectedPlan.durationDays} hari
                  </>
                ) : (
                  "Pilih paket"
                )}
              </p>
              <Button type="submit" size="lg" loading={submitting} loadingText="Menyimpan…">
                Simpan & buat kode
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
