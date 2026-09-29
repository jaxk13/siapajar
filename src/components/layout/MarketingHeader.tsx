import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "../../lib/router";
import { buttonClasses } from "../ui/Button";
import Container from "../ui/Container";
import Logo from "../ui/Logo";

const NAV_LINKS = [
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#hasil-dokumen", label: "Hasil Dokumen" },
  { href: "#kode-akses", label: "Kode Akses" },
];

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="SIAPAJAR.id, ke beranda" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-subtle hover:text-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/masuk" className={buttonClasses("primary", "md", "hidden sm:inline-flex")}>
            Masuk
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-fg-muted hover:bg-subtle md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Navigasi utama" className="border-t border-line bg-surface md:hidden">
          <Container className="py-3">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-base font-medium text-fg hover:bg-subtle"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link to="/masuk" className={buttonClasses("primary", "lg", "mt-3 w-full sm:hidden")}>
              Masuk dengan Kode Akses
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
}
