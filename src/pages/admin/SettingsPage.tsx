import { useEffect, useState, type FormEvent } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { adminApi } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, LoadingBlock, Panel } from "../../features/admin/components";
import { formatWhatsapp } from "../../features/admin/format";
import { usePageTitle } from "../../lib/router";

export default function SettingsPage() {
  usePageTitle("Pengaturan");
  const { handleAuthError } = useAdmin();
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.settings(), []);
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string }>();

  useEffect(() => {
    if (data) setWhatsapp(data.adminWhatsapp ? `0${data.adminWhatsapp.slice(2)}` : "");
  }, [data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await adminApi.updateSettings(whatsapp.trim());
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setMessage({ tone: "danger", text: result.message });
      return;
    }
    setMessage({
      tone: "success",
      text: result.data.adminWhatsapp ? `Nomor admin disimpan: ${formatWhatsapp(result.data.adminWhatsapp)}` : "Nomor admin dihapus.",
    });
  };

  return (
    <AdminShell title="Pengaturan">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Pengaturan</h1>
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && (
          <Panel title="WhatsApp admin">
            <form onSubmit={submit} noValidate className="space-y-5">
              {message && <Alert tone={message.tone} title={message.text} />}
              <FormField
                id="admin-wa"
                label="Nomor WhatsApp admin"
                hint="Tampil di halaman utama untuk pertanyaan, pembelian, dan verifikasi pembayaran. Kosongkan untuk menyembunyikan."
              >
                {(c) => <Input {...c} type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="081234567890" maxLength={20} />}
              </FormField>
              <Button type="submit" loading={busy} loadingText="Menyimpan…">
                Simpan
              </Button>
            </form>
          </Panel>
        )}
      </div>
    </AdminShell>
  );
}
