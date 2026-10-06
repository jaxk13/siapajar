import { useEffect } from "react";
import { Check, CheckCircle2, CircleAlert, Copy, GripVertical, Pencil, UserCheck } from "lucide-react";
import MarketingFooter from "../components/layout/MarketingFooter";
import MarketingHeader from "../components/layout/MarketingHeader";
import SkipLink from "../components/layout/SkipLink";
import Badge from "../components/ui/Badge";
import { buttonClasses } from "../components/ui/Button";
import Container from "../components/ui/Container";
import PricingSection from "../features/plans/PricingSection";
import { captureAttribution } from "../features/tracking/attribution";
import { useMetaPixel } from "../features/tracking/metaPixel";
import { Link, usePageTitle } from "../lib/router";

// Content follows docs/PRD.md §3 (problems), §6 (workflow) and §9–16 (outputs).

const PROBLEMS = [
  {
    title: "Banyak pekerjaan terpisah",
    text: "Menentukan materi, menulis soal dan opsi jawaban, membuat kunci, menyusun kisi-kisi, sampai menyiapkan dokumen untuk dicetak.",
  },
  {
    title: "Menulis perintah untuk AI",
    text: "Kualitas hasil AI sangat bergantung pada instruksi yang diberikan, dan tidak semua guru sempat menyusun instruksi yang lengkap.",
  },
  {
    title: "Hasil AI tidak seragam",
    text: "Format jawaban AI bisa berbeda-beda setiap kali, sehingga sulit dipindahkan langsung ke naskah.",
  },
  {
    title: "Merapikan ulang di Word",
    text: "Nomor soal, opsi jawaban, spasi, kop sekolah, kunci, dan kisi-kisi harus diatur satu per satu.",
  },
];

const STEPS = [
  {
    title: "Tentukan parameter soal",
    text: "Pilih jenjang, kelas, mata pelajaran, materi, jenis penilaian, jenis dan jumlah soal, serta tingkat kesulitan.",
  },
  {
    title: "Salin prompt yang sudah disusun",
    text: "SIAPAJAR menyusun instruksi lengkap untuk AI. Anda tidak perlu menulis prompt sendiri.",
  },
  {
    title: "Jalankan di AI pilihan Anda",
    text: "Tempel prompt ke ChatGPT, Gemini, atau AI lain yang biasa Anda gunakan, lalu salin hasilnya.",
  },
  {
    title: "Impor dan periksa",
    text: "Tempel hasil AI. Setiap soal dibaca dan diperiksa kelengkapannya. Soal yang bermasalah ditandai tanpa membuang soal lainnya.",
  },
  {
    title: "Edit naskah",
    text: "Perbaiki pertanyaan, stimulus, opsi, kunci, pembahasan, dan skor. Nomor soal menyesuaikan urutan secara otomatis.",
  },
  {
    title: "Unduh Word atau PDF",
    text: "Naskah lengkap dengan kop sekolah, kisi-kisi, dan kunci jawaban, siap diedit atau dicetak.",
  },
];

const OUTPUTS = [
  {
    title: "Naskah soal",
    text: "Pilihan Ganda, Pilihan Ganda Kompleks, Benar/Salah, Isian, dan Uraian.",
  },
  {
    title: "Kisi-kisi",
    text: "Materi, indikator, level kognitif, bentuk soal, dan skor. Semua kolom bisa diedit.",
  },
  {
    title: "Kunci jawaban dan rubrik",
    text: "Kunci serta skor setiap soal, termasuk rubrik penilaian untuk soal uraian.",
  },
  {
    title: "Kop sekolah",
    text: "Identitas dan logo sekolah tersimpan di perangkat Anda, tidak perlu diketik ulang.",
  },
  {
    title: "Word dan Print/PDF",
    text: "Kertas A4 atau F4, tata letak satu kolom atau dua kolom hemat kertas.",
  },
];

export default function LandingPage() {
  usePageTitle("Susun naskah soal ujian lebih cepat");
  useMetaPixel();
  useEffect(captureAttribution, []);

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      <MarketingHeader />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="border-b border-line bg-surface">
          <Container className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-primary-text">
                Untuk guru SD/MI, SMP/MTs, SMA/MA, dan SMK
              </p>
              <h1
                id="hero-title"
                className="mt-3 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl lg:text-[2.625rem]"
              >
                Susun naskah soal ujian, lengkap dengan kisi-kisi dan kunci jawaban.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
                SIAPAJAR menyiapkan perintah untuk AI yang biasa Anda pakai, merapikan hasilnya menjadi butir soal,
                lalu menyusunnya menjadi dokumen Word atau PDF siap cetak. Anda tetap memeriksa dan menentukan naskah
                akhirnya.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/masuk" className={buttonClasses("primary", "lg")}>
                  Masuk dengan Kode Akses
                </Link>
                <a href="#cara-kerja" className={buttonClasses("secondary", "lg")}>
                  Lihat cara kerja
                </a>
              </div>
              <p className="mt-4 text-sm text-fg-subtle">Tanpa registrasi akun. Cukup satu kode akses.</p>
            </div>

            <QuestionPreview />
          </Container>
        </section>

        {/* Problems */}
        <section aria-labelledby="masalah-title" className="py-16 md:py-24">
          <Container>
            <div className="max-w-2xl">
              <h2 id="masalah-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Yang biasanya menyita waktu saat menyusun soal
              </h2>
              <p className="mt-3 text-base text-fg-muted">
                SIAPAJAR menggabungkan pekerjaan ini ke dalam satu alur kerja, dari parameter soal sampai dokumen siap
                cetak.
              </p>
            </div>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {PROBLEMS.map((item) => (
                <li key={item.title} className="border-t border-line-strong pt-5">
                  <h3 className="text-base font-semibold text-fg">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* How it works */}
        <section id="cara-kerja" aria-labelledby="cara-kerja-title" className="border-y border-line bg-surface py-16 md:py-24">
          <Container>
            <div className="max-w-2xl">
              <h2 id="cara-kerja-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Cara kerja SIAPAJAR
              </h2>
              <p className="mt-3 text-base text-fg-muted">
                Enam langkah dari parameter soal sampai dokumen. AI dijalankan di platform pilihan Anda; SIAPAJAR
                menyiapkan prompt dan merapikan hasilnya.
              </p>
            </div>

            <ol className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-sm font-bold tabular-nums text-primary-text"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-fg">
                      <span className="sr-only">Langkah {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex items-start gap-3 rounded-lg bg-primary-soft px-5 py-4">
              <UserCheck className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-fg">
                <span className="font-semibold">Guru tetap memegang keputusan.</span> Hasil AI diperlakukan sebagai
                draf. Anda meninjau dan menyunting setiap soal sebelum naskah digunakan.
              </p>
            </div>
          </Container>
        </section>

        {/* Outputs */}
        <section id="hasil-dokumen" aria-labelledby="hasil-title" className="py-16 md:py-24">
          <Container className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div>
              <h2 id="hasil-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Satu naskah, lengkap dengan dokumen pendukungnya
              </h2>
              <p className="mt-3 text-base text-fg-muted">
                Semua dokumen disusun dari data soal yang sama, sehingga kisi-kisi dan kunci jawaban selalu sesuai
                dengan naskah.
              </p>
              <dl className="mt-8 divide-y divide-line border-y border-line">
                {OUTPUTS.map((item) => (
                  <div key={item.title} className="flex gap-3 py-4">
                    <Check className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
                    <div>
                      <dt className="text-sm font-semibold text-fg">{item.title}</dt>
                      <dd className="mt-0.5 text-sm text-fg-muted">{item.text}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <DocumentPreview />
          </Container>
        </section>

        <PricingSection />

        {/* Final CTA */}
        <section aria-labelledby="cta-title" className="border-t border-line py-16 md:py-20">
          <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 id="cta-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Sudah punya kode akses?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-fg-muted">
                Masuk dan mulai dari parameter soal. Draf naskah tersimpan otomatis di perangkat Anda.
              </p>
            </div>
            <Link to="/masuk" className={buttonClasses("primary", "lg", "shrink-0")}>
              Masuk dengan Kode Akses
            </Link>
          </Container>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

/** Static preview of an editor question card. Decorative controls are hidden from assistive tech. */
function QuestionPreview() {
  const options = [
    { key: "A", text: "Kadar oksigen di udara lingkungan menurun" },
    { key: "B", text: "Kadar karbon dioksida dalam darah meningkat", correct: true },
    { key: "C", text: "Volume paru-paru mengecil saat berlari" },
    { key: "D", text: "Kebutuhan air dalam sel otot meningkat" },
  ];

  return (
    <figure className="w-full">
      <div className="rounded-lg border border-line bg-surface shadow-overlay">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 text-fg-subtle" aria-hidden="true" />
            <span className="text-sm font-semibold text-fg">Soal 12</span>
            <Badge tone="brand">PG</Badge>
            <Badge tone="outline">C4</Badge>
          </div>
          <div className="flex items-center gap-1 text-fg-subtle" aria-hidden="true">
            <span className="rounded p-1.5"><Pencil className="size-4" /></span>
            <span className="rounded p-1.5"><Copy className="size-4" /></span>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <p className="text-sm leading-relaxed text-fg">
            Seorang atlet berlari sejauh 100 meter, lalu frekuensi pernapasannya meningkat. Faktor utama yang
            menyebabkan peningkatan frekuensi pernapasan tersebut adalah …
          </p>
          <ul className="space-y-2">
            {options.map((opt) => (
              <li
                key={opt.key}
                className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                  opt.correct ? "border-brand-300 bg-primary-soft" : "border-line"
                }`}
              >
                <span className="w-4 shrink-0 font-semibold text-fg-muted">{opt.key}.</span>
                <span className="flex-1 text-fg">{opt.text}</span>
                {opt.correct && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-text">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Kunci
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-fg-subtle">
            <span>IPA · Kelas VIII · Sistem Pernapasan</span>
            <span className="font-semibold text-fg-muted">Skor 2</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <p className="text-fg-muted">
          <span className="font-semibold text-fg">38 soal siap, 2 perlu diperiksa.</span> Soal nomor 17: kunci jawaban
          tidak ditemukan.
        </p>
      </div>
      <figcaption className="sr-only">
        Contoh tampilan editor: kartu soal pilihan ganda dengan kunci jawaban, dan ringkasan hasil impor.
      </figcaption>
    </figure>
  );
}

/** Scaled-down exam sheet showing header, identity block and questions. */
function DocumentPreview() {
  return (
    <figure className="w-full">
      <div className="mx-auto max-w-[34rem] rounded-sm border border-line-strong bg-white p-6 text-[#111] shadow-overlay sm:p-8">
        <div className="flex items-center gap-4 border-b-[3px] border-double border-[#111] pb-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#999] text-[9px] font-semibold text-[#666]" aria-hidden="true">
            LOGO
          </div>
          <div className="flex-1 text-center leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wide">Pemerintah Kabupaten Sukamaju</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide">Dinas Pendidikan</p>
            <p className="text-sm font-bold uppercase">SMP Negeri 1 Sukamaju</p>
            <p className="text-[9px] text-[#444]">Jl. Pendidikan No. 1, Sukamaju</p>
          </div>
          <div className="size-11 shrink-0" aria-hidden="true" />
        </div>

        <p className="mt-3 text-center text-xs font-bold uppercase">Sumatif Akhir Semester Ganjil</p>
        <table className="mt-2 w-full text-[10px]">
          <tbody>
            <tr>
              <td className="w-24 py-0.5">Mata Pelajaran</td>
              <td>: Ilmu Pengetahuan Alam</td>
              <td className="w-16">Kelas</td>
              <td className="w-16">: VIII</td>
            </tr>
            <tr>
              <td className="py-0.5">Hari/Tanggal</td>
              <td>: ………………</td>
              <td>Waktu</td>
              <td>: 90 menit</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-[10px] font-bold">A. Pilihan Ganda</p>
        <div className="mt-1.5 space-y-2.5 text-[10px] leading-snug">
          <div>
            <p>1. Organ tempat terjadinya pertukaran oksigen dan karbon dioksida pada manusia adalah …</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 pl-3">
              <span>A. trakea</span>
              <span>C. alveolus</span>
              <span>B. bronkus</span>
              <span>D. laring</span>
            </div>
          </div>
          <div>
            <p>2. Enzim ptialin di dalam mulut berperan memecah …</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 pl-3">
              <span>A. lemak</span>
              <span>C. amilum</span>
              <span>B. protein</span>
              <span>D. vitamin</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-1.5" aria-hidden="true">
          <div className="h-1.5 w-11/12 rounded-full bg-[#e6e6e6]" />
          <div className="h-1.5 w-9/12 rounded-full bg-[#e6e6e6]" />
          <div className="h-1.5 w-10/12 rounded-full bg-[#e6e6e6]" />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-fg-subtle">
        Contoh halaman naskah dengan kop sekolah, ukuran A4, satu kolom.
      </figcaption>
    </figure>
  );
}
