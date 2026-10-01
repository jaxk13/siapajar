import { useState } from "react";
import { Ban, RefreshCw } from "lucide-react";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import FormField from "../../components/ui/FormField";
import Textarea from "../../components/ui/Textarea";
import { adminApi, type CodeRow, type IssuedCode } from "./adminApi";
import { useAdmin } from "./AdminProvider";
import { IssuedCodePanel } from "./components";
import { formatDate } from "./format";

type Mode = "none" | "regenerate" | "disable" | "issued";

/** "Ganti kode" and "Nonaktifkan" for one access code, with confirmation dialogs. */
export default function CodeActions({ code, onChanged }: { code: CodeRow; onChanged: () => void }) {
  const { handleAuthError } = useAdmin();
  const [mode, setMode] = useState<Mode>("none");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const usable = code.status === "unused" || code.status === "active";
  if (!usable) return null;

  const close = () => {
    setMode("none");
    setError(undefined);
    setReason("");
  };

  const regenerate = async () => {
    setBusy(true);
    setError(undefined);
    const result = await adminApi.regenerateCode(code.id);
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setError(result.message);
      return;
    }
    setIssued(result.data.issued);
    setMode("issued");
    onChanged();
  };

  const disable = async () => {
    if (!reason.trim()) {
      setError("Tuliskan alasan menonaktifkan kode.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await adminApi.disableCode(code.id, reason.trim());
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setError(result.message);
      return;
    }
    close();
    onChanged();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setMode("regenerate")} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
          Ganti kode
        </Button>
        <Button variant="danger" size="sm" onClick={() => setMode("disable")} icon={<Ban className="size-4" aria-hidden="true" />}>
          Nonaktifkan
        </Button>
      </div>

      <Dialog
        open={mode === "regenerate"}
        onClose={close}
        title={`Ganti kode …${code.hint}?`}
        description="Gunakan jika pembeli kehilangan kodenya."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Batal
            </Button>
            <Button onClick={regenerate} loading={busy} loadingText="Membuat kode…">
              Ganti kode
            </Button>
          </>
        }
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
          <li>Kode lama langsung tidak berlaku.</li>
          <li>Semua perangkat yang sedang memakai kode ini akan dikeluarkan.</li>
          <li>{code.expiresAt ? `Masa aktif tetap sampai ${formatDate(code.expiresAt)}.` : "Masa aktif belum berjalan dan tidak berubah."}</li>
        </ul>
        {error && <Alert tone="danger" title={error} className="mt-4" />}
      </Dialog>

      <Dialog
        open={mode === "disable"}
        onClose={close}
        title={`Nonaktifkan kode …${code.hint}?`}
        description="Kode tidak bisa dipakai lagi dan tindakan ini tidak dapat dibatalkan."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Batal
            </Button>
            <Button variant="danger" onClick={disable} loading={busy} loadingText="Menonaktifkan…">
              Nonaktifkan kode
            </Button>
          </>
        }
      >
        <FormField id="disable-reason" label="Alasan" hint="Contoh: kode dibagikan, pembayaran dibatalkan." error={error}>
          {(control) => <Textarea {...control} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}
        </FormField>
      </Dialog>

      <Dialog open={mode === "issued"} onClose={() => setMode("none")} title="Kode baru berhasil dibuat" footer={<Button onClick={() => setMode("none")}>Selesai</Button>}>
        {issued && <IssuedCodePanel issued={issued} />}
      </Dialog>
    </>
  );
}
