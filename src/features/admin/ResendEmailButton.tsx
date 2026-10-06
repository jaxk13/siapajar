import { useState } from "react";
import { Mail } from "lucide-react";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { adminApi } from "./adminApi";
import { useAdmin } from "./AdminProvider";

/** Issues a new code for the order and emails it (ADR-017). The email address can be corrected first. */
export default function ResendEmailButton({
  orderId,
  currentEmail,
  codeActive,
  onDone,
}: {
  orderId: string;
  currentEmail: string | null;
  /** The code has been used already, so devices will be signed out. */
  codeActive: boolean;
  onDone: () => void;
}) {
  const { handleAuthError } = useAdmin();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ status: "sent" | "failed" | "skipped"; email: string } | null>(null);

  const close = () => {
    setOpen(false);
    setError(undefined);
    if (result) onDone();
    setResult(null);
  };

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Isi alamat email yang valid.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const response = await adminApi.resendOrderEmail(orderId, email.trim());
    setBusy(false);
    if (!response.ok) {
      if (!handleAuthError(response)) setError(response.message);
      return;
    }
    setResult(response.data);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} icon={<Mail className="size-4" aria-hidden="true" />}>
        Kirim ulang via email
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Kirim ulang kode lewat email?"
        description="Pembeli menerima kode baru dalam email bergambar yang sama seperti setelah pembayaran."
        footer={
          result ? (
            <Button onClick={close}>Selesai</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close}>
                Batal
              </Button>
              <Button onClick={send} loading={busy} loadingText="Mengirim…">
                Buat kode baru & kirim
              </Button>
            </>
          )
        }
      >
        {result ? (
          result.status === "sent" ? (
            <Alert tone="success" title={`Kode baru terkirim ke ${result.email}.`} />
          ) : (
            <Alert tone="danger" title={result.status === "skipped" ? "Email belum diatur di server (SMTP_HOST)." : "Email gagal dikirim."}>
              Kode baru sudah dibuat. Gunakan <strong>Ganti kode</strong> lalu kirim lewat WhatsApp, atau coba lagi nanti.
            </Alert>
          )
        ) : (
          <div className="space-y-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>Kode lama langsung tidak berlaku.</li>
              {codeActive && <li>Semua perangkat yang sedang memakai kode ini akan dikeluarkan.</li>}
              <li>Masa aktif tidak berubah.</li>
            </ul>
            <FormField id="resend-email" label="Email pembeli" hint="Perbaiki jika pembeli salah menulis email saat checkout." error={error}>
              {(control) => <Input {...control} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />}
            </FormField>
          </div>
        )}
      </Dialog>
    </>
  );
}
