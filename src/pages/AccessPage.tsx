import { useRef, useState, type FormEvent } from "react";
import AuthLayout from "../components/layout/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAccess } from "../features/access/AccessProvider";
import { Link, usePageTitle, useRouter } from "../lib/router";

export default function AccessPage() {
  usePageTitle("Masuk");
  const { activate } = useAccess();
  const { navigate } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(undefined);

    if (!code.trim()) {
      setFieldError("Masukkan kode akses terlebih dahulu.");
      inputRef.current?.focus();
      return;
    }
    setFieldError(undefined);

    setSubmitting(true);
    try {
      const result = await activate(code);
      if (result.ok) {
        navigate("/app", { replace: true });
        return;
      }
      setFormError(result.message);
      inputRef.current?.select();
    } catch {
      setFormError("Kode akses belum dapat diperiksa. Periksa koneksi internet Anda, lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Masuk ke SIAPAJAR</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Masukkan kode akses yang Anda terima setelah pembelian.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {formError && <Alert tone="danger" title={formError} />}

          <FormField
            id="access-code"
            label="Kode akses"
            hint="Format: SPJR-XXXX-XXXX-XXXX. Huruf besar dan kecil tidak dibedakan."
            error={fieldError}
          >
            {(control) => (
              <Input
                {...control}
                ref={inputRef}
                name="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                className="font-mono tracking-wider uppercase"
              />
            )}
          </FormField>

          <Button type="submit" size="lg" className="w-full" loading={submitting} loadingText="Memeriksa kode…">
            Masuk
          </Button>
        </form>
      </div>

      <div className="mt-6 space-y-1 text-center text-sm">
        <p className="text-fg-muted">
          Belum punya kode akses?{" "}
          <Link to="/#kode-akses" className="font-semibold text-primary-text underline-offset-4 hover:underline">
            Cara mendapatkannya
          </Link>
        </p>
        <p className="text-fg-subtle">Tanpa registrasi akun. Draf naskah tersimpan di perangkat ini.</p>
      </div>
    </AuthLayout>
  );
}
