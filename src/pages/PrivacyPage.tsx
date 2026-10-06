import { ArrowLeft } from "lucide-react";
import MarketingFooter from "../components/layout/MarketingFooter";
import SkipLink from "../components/layout/SkipLink";
import Container from "../components/ui/Container";
import Logo from "../components/ui/Logo";
import { useMetaPixel } from "../features/tracking/metaPixel";
import { Link, usePageTitle } from "../lib/router";

// Plain-language privacy notice for buyers (ADR-017). Review with a legal advisor before launch.

const SECTIONS = [
  {
    title: "Data yang kami kumpulkan",
    items: [
      "Saat membeli: nama, alamat email, nomor WhatsApp, paket yang dipilih, dan status pembayaran.",
      "Sumber kunjungan: parameter iklan pada tautan (misalnya utm_campaign) dan penanda klik iklan Meta.",
      "Saat memakai SIAPAJAR: kode akses yang dipakai, waktu masuk, dan jenis perangkat/peramban untuk membatasi jumlah perangkat.",
      "Naskah soal, kop sekolah, dan pengaturan Anda disimpan di perangkat Anda sendiri, bukan di server kami.",
    ],
  },
  {
    title: "Untuk apa data dipakai",
    items: [
      "Memproses pesanan dan mengirim kode akses ke email Anda.",
      "Menghubungi Anda terkait pesanan, misalnya jika pembayaran belum selesai atau ada kendala.",
      "Mengukur efektivitas iklan kami (berapa orang yang melihat, memesan, dan membeli).",
      "Menjaga keamanan layanan, misalnya mencegah penyalahgunaan kode akses.",
    ],
  },
  {
    title: "Pihak lain yang terlibat",
    items: [
      "Midtrans memproses pembayaran. Data kartu atau rekening Anda dikelola Midtrans, tidak disimpan oleh SIAPAJAR.",
      "Penyedia layanan email kami mengirimkan email berisi kode akses.",
      "Meta (Facebook/Instagram) menerima data peristiwa kunjungan, pemesanan, dan pembelian untuk pengukuran iklan. Email dan nomor WhatsApp dikirim dalam bentuk tersandi (hash), bukan teks aslinya.",
      "Kami tidak menjual data Anda.",
    ],
  },
  {
    title: "Penyimpanan dan hak Anda",
    items: [
      "Kode akses disimpan dalam bentuk tersandi, sehingga tim kami pun tidak dapat melihat kode lengkapnya.",
      "Alamat IP dan informasi peramban yang dipakai untuk pengukuran iklan dihapus dari data pesanan setelah tidak diperlukan.",
      "Anda dapat meminta salinan, perbaikan, atau penghapusan data pesanan Anda dengan menghubungi admin lewat WhatsApp yang tercantum di halaman Harga.",
    ],
  },
];

export default function PrivacyPage() {
  usePageTitle("Kebijakan Privasi");
  useMetaPixel();

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      {/* The marketing header links to sections of the landing page, so this page uses a simple header. */}
      <header className="border-b border-line bg-surface">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" aria-label="SIAPAJAR.id, ke beranda" className="rounded-md">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Kembali<span className="hidden sm:inline"> ke beranda</span></span>
          </Link>
        </Container>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Container size="content" className="py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-fg">Kebijakan Privasi</h1>
          <p className="mt-3 text-base text-fg-muted">
            Halaman ini menjelaskan data apa yang dikumpulkan SIAPAJAR.id saat Anda membeli dan memakai layanan, serta bagaimana data
            tersebut digunakan.
          </p>
          <div className="mt-10 space-y-10">
            {SECTIONS.map((section, index) => (
              <section key={section.title} aria-labelledby={`privasi-${index}`}>
                <h2 id={`privasi-${index}`} className="text-lg font-semibold text-fg">
                  {section.title}
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </div>
  );
}
