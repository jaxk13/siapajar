import { Link } from "../../lib/router";
import Container from "../ui/Container";
import Logo from "../ui/Logo";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-fg-muted">
            Asisten penyusunan naskah soal untuk guru SD/MI, SMP/MTs, SMA/MA, dan SMK.
          </p>
        </div>

        <nav aria-label="Tautan footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a href="#cara-kerja" className="text-fg-muted hover:text-fg">Cara Kerja</a>
            </li>
            <li>
              <a href="#hasil-dokumen" className="text-fg-muted hover:text-fg">Hasil Dokumen</a>
            </li>
            <li>
              <a href="#kode-akses" className="text-fg-muted hover:text-fg">Kode Akses</a>
            </li>
            <li>
              <Link to="/masuk" className="text-fg-muted hover:text-fg">Masuk</Link>
            </li>
          </ul>
        </nav>
      </Container>
      <Container className="border-t border-line py-5">
        <p className="text-xs text-fg-subtle">© {new Date().getFullYear()} SIAPAJAR.id</p>
      </Container>
    </footer>
  );
}
