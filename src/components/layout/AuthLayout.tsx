import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "../../lib/router";
import Container from "../ui/Container";
import Logo from "../ui/Logo";
import SkipLink from "./SkipLink";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header>
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" aria-label="SIAPAJAR.id, ke beranda" className="rounded-md">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Kembali<span className="hidden sm:inline"> ke beranda</span></span>
          </Link>
        </Container>
      </header>

      <main id="main-content" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 outline-none sm:items-center sm:pt-0">
        <div className="w-full max-w-[25rem]">{children}</div>
      </main>
    </div>
  );
}
