import { useState, type FormEvent } from "react";
import { KeyRound, Pencil, UserPlus } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { adminApi, type TeamMember, type UserRole } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import { CopyButton, ErrorBlock, LoadingBlock } from "../../features/admin/components";
import { formatDateTime, ROLE_LABELS } from "../../features/admin/format";
import { usePageTitle } from "../../lib/router";

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; member: TeamMember }
  | { kind: "reset"; member: TeamMember }
  | { kind: "password"; name: string; email: string; password: string };

export default function TeamPage() {
  usePageTitle("Tim Admin");
  const { user } = useAdmin();
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.users(), []);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const close = () => setDialog({ kind: "none" });

  return (
    <AdminShell
      title="Tim Admin"
      actions={
        <Button onClick={() => setDialog({ kind: "create" })} icon={<UserPlus className="size-4" aria-hidden="true" />}>
          <span className="hidden sm:inline">Tambah anggota</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Tim admin</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Tidak ada pendaftaran mandiri. Anggota baru mendapat password sementara yang wajib diganti saat pertama masuk.
          </p>
        </div>
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {data.users.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                    {m.name}
                    {m.id === user?.id && <span className="text-xs font-normal text-fg-subtle">(Anda)</span>}
                    <Badge tone={m.role === "super_admin" ? "brand" : "outline"}>{ROLE_LABELS[m.role]}</Badge>
                    {!m.isActive && <Badge tone="danger">Nonaktif</Badge>}
                    {m.isActive && m.mustChangePassword && <Badge tone="neutral">Belum ganti password</Badge>}
                  </p>
                  <p className="truncate text-sm text-fg-subtle">
                    {m.email} · terakhir masuk {m.lastLoginAt ? formatDateTime(m.lastLoginAt) : "belum pernah"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "edit", member: m })} icon={<Pencil className="size-4" aria-hidden="true" />}>
                    Ubah
                  </Button>
                  {m.id !== user?.id && (
                    <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "reset", member: m })} icon={<KeyRound className="size-4" aria-hidden="true" />}>
                      Reset password
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog.kind === "create" && (
        <MemberDialog
          onClose={close}
          onSaved={(result) => {
            reload();
            if (result.password) setDialog({ kind: "password", ...result.password });
            else close();
          }}
        />
      )}
      {dialog.kind === "edit" && (
        <MemberDialog
          member={dialog.member}
          isSelf={dialog.member.id === user?.id}
          onClose={close}
          onSaved={() => {
            reload();
            close();
          }}
        />
      )}
      {dialog.kind === "reset" && (
        <ResetDialog
          member={dialog.member}
          onClose={close}
          onDone={(password) => {
            reload();
            setDialog({ kind: "password", name: dialog.member.name, email: dialog.member.email, password });
          }}
        />
      )}
      <Dialog open={dialog.kind === "password"} onClose={close} title="Password sementara" footer={<Button onClick={close}>Selesai</Button>}>
        {dialog.kind === "password" && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Berikan secara pribadi kepada <span className="font-semibold text-fg">{dialog.name}</span>. Password ini hanya ditampilkan sekali dan wajib diganti saat
              pertama masuk di <span className="font-mono">/super-admin/masuk</span>.
            </p>
            <dl className="space-y-2 rounded-md bg-subtle px-3 py-3">
              <div>
                <dt className="text-xs text-fg-subtle">Email</dt>
                <dd className="font-mono text-sm text-fg">{dialog.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Password sementara</dt>
                <dd className="select-all font-mono text-lg font-semibold text-fg">{dialog.password}</dd>
              </div>
            </dl>
            <CopyButton text={`Email: ${dialog.email}\nPassword sementara: ${dialog.password}`} label="Salin email & password" />
          </div>
        )}
      </Dialog>
    </AdminShell>
  );
}

function MemberDialog({
  member,
  isSelf = false,
  onClose,
  onSaved,
}: {
  member?: TeamMember;
  isSelf?: boolean;
  onClose: () => void;
  onSaved: (result: { password?: { name: string; email: string; password: string } }) => void;
}) {
  const { handleAuthError } = useAdmin();
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<UserRole>(member?.role ?? "admin");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(undefined);
    if (member) {
      const result = await adminApi.updateUser(member.id, { name: name.trim(), role, isActive });
      setBusy(false);
      if (!result.ok) return void (!handleAuthError(result) && setError(result.message));
      onSaved({});
    } else {
      const result = await adminApi.createUser({ name: name.trim(), email: email.trim(), role });
      setBusy(false);
      if (!result.ok) return void (!handleAuthError(result) && setError(result.message));
      onSaved({ password: { name: result.data.user.name, email: result.data.user.email, password: result.data.temporaryPassword } });
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={member ? `Ubah ${member.name}` : "Tambah anggota tim"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => submit()} loading={busy} loadingText="Menyimpan…">
            {member ? "Simpan" : "Tambah anggota"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert tone="danger" title={error} />}
        <FormField id="member-name" label="Nama">
          {(c) => <Input {...c} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />}
        </FormField>
        <FormField id="member-email" label="Email" hint={member ? "Email tidak dapat diubah." : "Dipakai untuk masuk."}>
          {(c) => <Input {...c} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(member)} />}
        </FormField>
        <FormField id="member-role" label="Peran" hint="Super admin dapat mengelola tim, paket, dan pengaturan." >
          {(c) => (
            <Select {...c} value={role} onChange={(e) => setRole(e.target.value as UserRole)} disabled={isSelf}>
              <option value="admin">{ROLE_LABELS.admin}</option>
              <option value="super_admin">{ROLE_LABELS.super_admin}</option>
            </Select>
          )}
        </FormField>
        {member && !isSelf && (
          <label className="flex items-start gap-3 rounded-md border border-line px-3 py-3">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="mt-0.5 size-4 accent-[var(--sa-primary)]" />
            <span className="text-sm">
              <span className="font-semibold text-fg">Akun aktif</span>
              <span className="block text-fg-subtle">Jika dinonaktifkan, anggota langsung dikeluarkan dan tidak bisa masuk.</span>
            </span>
          </label>
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function ResetDialog({ member, onClose, onDone }: { member: TeamMember; onClose: () => void; onDone: (password: string) => void }) {
  const { handleAuthError } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const reset = async () => {
    setBusy(true);
    const result = await adminApi.resetPassword(member.id);
    setBusy(false);
    if (!result.ok) return void (!handleAuthError(result) && setError(result.message));
    onDone(result.data.temporaryPassword);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Reset password ${member.name}?`}
      description="Password lama tidak berlaku lagi dan semua perangkatnya dikeluarkan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={reset} loading={busy} loadingText="Mereset…">
            Reset password
          </Button>
        </>
      }
    >
      {error ? <Alert tone="danger" title={error} /> : <p className="text-sm text-fg-muted">Anda akan mendapat password sementara baru untuk diberikan ke {member.name}.</p>}
    </Dialog>
  );
}
