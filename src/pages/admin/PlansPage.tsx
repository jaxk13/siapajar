import { useEffect, useState, type FormEvent } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { adminApi, type AdminPlan } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import { ErrorBlock, LoadingBlock, Panel } from "../../features/admin/components";
import { formatRupiah } from "../../features/admin/format";
import { usePageTitle } from "../../lib/router";

export default function PlansPage() {
  usePageTitle("Paket & Harga");
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.plans(), []);

  return (
    <AdminShell title="Paket & Harga">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Paket & harga</h1>
          <p className="mt-1 text-sm text-fg-muted">Data ini tampil di section Harga pada halaman utama.</p>
        </div>
        <Alert tone="info" title="Perubahan hanya berlaku untuk kode baru">
          Kode yang sudah dibuat tetap memakai masa aktif dan batas perangkat saat kode itu dibuat.
        </Alert>
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        <div className="grid gap-6 xl:grid-cols-2">
          {data?.plans.map((plan) => (
            <PlanForm key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function PlanForm({ plan }: { plan: AdminPlan }) {
  const { handleAuthError } = useAdmin();
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    priceIdr: String(plan.priceIdr),
    durationDays: String(plan.durationDays),
    maxDevices: plan.maxDevices === null ? "" : String(plan.maxDevices),
    isActive: plan.isActive,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string }>();

  useEffect(() => {
    if (message?.tone !== "success") return;
    const t = setTimeout(() => setMessage(undefined), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await adminApi.updatePlan({
      ...plan,
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceIdr: Number(form.priceIdr.replace(/\D/g, "")),
      durationDays: Number(form.durationDays),
      maxDevices: form.maxDevices.trim() === "" ? null : Number(form.maxDevices),
      isActive: form.isActive,
    });
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setMessage({ tone: "danger", text: result.message });
      return;
    }
    setMessage({ tone: "success", text: `Paket ${result.data.plan.name} tersimpan.` });
  };

  const price = Number(form.priceIdr.replace(/\D/g, "")) || 0;

  return (
    <Panel title={`Paket ${plan.name}`}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {message && <Alert tone={message.tone} title={message.text} />}
        <FormField id={`${plan.id}-name`} label="Nama paket">
          {(c) => <Input {...c} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />}
        </FormField>
        <FormField id={`${plan.id}-desc`} label="Deskripsi singkat" optional>
          {(c) => <Input {...c} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />}
        </FormField>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id={`${plan.id}-price`} label="Harga (Rp)" hint={formatRupiah(price)}>
            {(c) => <Input {...c} inputMode="numeric" value={form.priceIdr} onChange={(e) => set("priceIdr", e.target.value)} />}
          </FormField>
          <FormField id={`${plan.id}-days`} label="Masa aktif (hari)">
            {(c) => <Input {...c} type="number" min={1} max={3650} value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} />}
          </FormField>
          <FormField id={`${plan.id}-devices`} label="Maks. perangkat" hint="Kosong = tanpa batas">
            {(c) => <Input {...c} type="number" min={1} max={20} value={form.maxDevices} onChange={(e) => set("maxDevices", e.target.value)} />}
          </FormField>
        </div>
        <label className="flex items-start gap-3 rounded-md border border-line px-3 py-3">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="mt-0.5 size-4 accent-[var(--sa-primary)]" />
          <span className="text-sm">
            <span className="font-semibold text-fg">Tampilkan di halaman harga</span>
            <span className="block text-fg-subtle">Jika tidak dicentang, paket disembunyikan dari pengunjung tetapi tetap bisa dipakai admin.</span>
          </span>
        </label>
        {form.isActive && price === 0 && <Alert tone="danger" title="Harga masih Rp0 dan paket akan tampil di halaman harga." />}
        <Button type="submit" loading={busy} loadingText="Menyimpan…">
          Simpan paket
        </Button>
      </form>
    </Panel>
  );
}
