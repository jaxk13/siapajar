import { useState, type FormEvent } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { adminApi } from "../../features/admin/adminApi";
import { useAdmin } from "../../features/admin/AdminProvider";
import { Field, Panel } from "../../features/admin/components";
import { formatDateTime, ROLE_LABELS } from "../../features/admin/format";
import { usePageTitle, useRouter } from "../../lib/router";

export default function AccountPage() {
  usePageTitle("Akun Saya");
  const { user, refresh, handleAuthError } = useAdmin();
  const { navigate } = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const forced = Boolean(user?.mustChangePassword);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Masukkan password saat ini.";
    if (next.length < 10) found.next = "Password baru minimal 10 karakter.";
    else if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) found.next = "Password baru harus berisi huruf dan angka.";
    if (confirm !== next) found.confirm = "Konfirmasi password tidak sama.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const result = await adminApi.changePassword(current, next);
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setErrors({ form: result.message });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
    await refresh();
    if (forced) navigate("/super-admin", { replace: true });
  };

  return (
    <AdminShell title="Akun Saya">
      <div className="max-w-2xl space-y-6">
        {forced && (
          <Alert tone="info" title="Ganti password sementara Anda">
            Demi keamanan, buat password baru sebelum memakai panel admin.
          </Alert>
        )}

        {user && (
          <Panel title="Profil">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label="Nama">{user.name}</Field>
              <Field label="Email">{user.email}</Field>
              <Field label="Peran">{ROLE_LABELS[user.role]}</Field>
              <Field label="Sesi berakhir">{formatDateTime(user.sessionExpiresAt)}</Field>
            </dl>
          </Panel>
        )}

        <Panel title="Ganti password">
          <form onSubmit={submit} noValidate className="space-y-5">
            {errors.form && <Alert tone="danger" title={errors.form} />}
            {done && !forced && <Alert tone="success" title="Password berhasil diganti. Perangkat lain sudah dikeluarkan." />}
            <FormField id="pw-current" label={forced ? "Password sementara" : "Password saat ini"} error={errors.current}>
              {(c) => <Input {...c} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
            </FormField>
            <FormField id="pw-new" label="Password baru" hint="Minimal 10 karakter, berisi huruf dan angka." error={errors.next}>
              {(c) => <Input {...c} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
            </FormField>
            <FormField id="pw-confirm" label="Ulangi password baru" error={errors.confirm}>
              {(c) => <Input {...c} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </FormField>
            <Button type="submit" loading={busy} loadingText="Menyimpan…">
              Simpan password baru
            </Button>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
