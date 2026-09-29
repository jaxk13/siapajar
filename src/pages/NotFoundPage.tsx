import AuthLayout from "../components/layout/AuthLayout";
import { buttonClasses } from "../components/ui/Button";
import { Link, usePageTitle } from "../lib/router";

export default function NotFoundPage() {
  usePageTitle("Halaman tidak ditemukan");

  return (
    <AuthLayout>
      <div className="text-center">
        <p className="text-sm font-semibold text-primary-text">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Alamat yang Anda buka tidak tersedia. Periksa kembali alamatnya atau kembali ke beranda.
        </p>
        <Link to="/" className={buttonClasses("primary", "md", "mt-6")}>
          Kembali ke beranda
        </Link>
      </div>
    </AuthLayout>
  );
}
