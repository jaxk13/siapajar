import { useState, type FormEvent } from "react";
import AuthLayout from "../../components/layout/AuthLayout";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import { useAdmin } from "../../features/admin/AdminProvider";
import { usePageTitle, useRouter } from "../../lib/router";

/** Admin team sign-in. There is intentionally no registration or self-service password reset. */
export default function AdminLoginPage() {
  usePageTitle("Masuk Admin");
  const { login } = useAdmin();
  const { navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Masukkan email.";
    if (!password) next.password = "Masukkan password.";
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      navigate(result.data.user.mustChangePassword ? "/super-admin/akun" : "/super-admin", { replace: true });
    } else {
      setErrors({ form: result.message });
      setPassword("");
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="text-sm font-semibold text-primary-text">Panel Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Masuk tim admin</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Khusus anggota tim SIAPAJAR. Akun dibuat oleh super admin.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {errors.form && <Alert tone="danger" title={errors.form} />}
          <FormField id="admin-email" label="Email" error={errors.email}>
            {(control) => (
              <Input {...control} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            )}
          </FormField>
          <FormField id="admin-password" label="Password" error={errors.password}>
            {(control) => (
              <Input {...control} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={submitting} loadingText="Memeriksa…">
            Masuk
          </Button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-fg-subtle">Lupa password? Hubungi super admin untuk mereset password Anda.</p>
    </AuthLayout>
  );
}
