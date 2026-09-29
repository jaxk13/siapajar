import { useState } from "react";
import {
  Download,
  Printer,
  Copy,
  Check,
  FileText,
  Columns,
  AlignJustify,
  Plus,
  Trash2,
  RotateCcw,
  ListOrdered,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import { QuestionItem, KopData, ExportSettings } from "../types";
import { generateWordDocument } from "../features/export/exportWord";

interface DownloadStepProps {
  questions: QuestionItem[];
  kop: KopData;
  settings: ExportSettings;
  onChangeSettings: (settings: ExportSettings) => void;
  onShowToast: (msg: string) => void;
}

const DEFAULT_INSTRUCTIONS = [
  "Tulislah nama, nomor peserta, dan kelas Anda secara lengkap pada lembar jawaban yang tersedia!",
  "Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya!",
  "Dahulukan menjawab soal-soal yang Anda anggap mudah!",
  "Laporkan kepada pengawas ujian jika terdapat tulisan yang kurang jelas, rusak, atau jumlah soal kurang!",
  "Periksalah kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian!",
];

export default function DownloadStep({
  questions,
  kop,
  settings,
  onChangeSettings,
  onShowToast,
}: DownloadStepProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const instructions = Array.isArray(settings.instructions) && settings.instructions.length > 0
    ? settings.instructions
    : DEFAULT_INSTRUCTIONS;
  const layoutColumns = settings.layoutColumns || 2;
  const showInstructions = settings.showInstructions !== false;

  const handleUpdateInstruction = (index: number, val: string) => {
    const next = [...instructions];
    next[index] = val;
    onChangeSettings({ ...settings, instructions: next });
  };

  const handleAddInstruction = () => {
    const next = [...instructions, ""];
    onChangeSettings({ ...settings, instructions: next });
  };

  const handleRemoveInstruction = (index: number) => {
    const next = instructions.filter((_, i) => i !== index);
    onChangeSettings({ ...settings, instructions: next });
  };

  const handleResetInstructions = () => {
    onChangeSettings({ ...settings, instructions: [...DEFAULT_INSTRUCTIONS] });
    onShowToast("Petunjuk pengerjaan dikembalikan ke format standar!");
  };

  const handleDownloadWord = () => {
    if (questions.length === 0) {
      onShowToast("Belum ada butir soal untuk diunduh.");
      return;
    }
    generateWordDocument(questions, kop, {
      ...settings,
      layoutColumns,
      instructions,
      showInstructions,
    });
    onShowToast("Berkas dokumen Word (.doc) berhasil diunduh!");
  };

  const handlePrint = () => {
    if (questions.length === 0) {
      onShowToast("Belum ada butir soal untuk dicetak.");
      return;
    }
    window.print();
  };

  const handleCopyRawText = async () => {
    if (questions.length === 0) return;
    const lines = [
      `${kop.ujian || "ASESMEN"} - ${kop.mapel || "MATA PELAJARAN"}`,
      `Kelas: ${kop.kelas || "-"} | Waktu: ${kop.waktu || "-"}`,
      "--------------------------------------------------",
      "",
    ];

    if (showInstructions && instructions.length > 0) {
      lines.push("PETUNJUK UMUM:");
      instructions.forEach((ins, idx) => {
        lines.push(`${idx + 1}. ${ins}`);
      });
      lines.push("--------------------------------------------------");
      lines.push("");
    }

    questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. [${q.type}] ${q.question}`);
      if (q.type === "PG" || q.type === "PGK") {
        if (q.a) lines.push(`   A. ${q.a}`);
        if (q.b) lines.push(`   B. ${q.b}`);
        if (q.c) lines.push(`   C. ${q.c}`);
        if (q.d) lines.push(`   D. ${q.d}`);
        if (q.e) lines.push(`   E. ${q.e}`);
      }
      lines.push("");
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedText(true);
      onShowToast("Teks naskah soal disalin ke clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      onShowToast("Gagal menyalin teks.");
    }
  };

  const handleCopyKeyAnswers = async () => {
    if (questions.length === 0) return;
    const lines = [
      `KUNCI JAWABAN: ${kop.mapel || "Mata Pelajaran"} (${kop.kelas || "Kelas"})`,
      "--------------------------------------------------",
    ];

    questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. [${q.type}] ${q.key || "-"} (${q.level})`);
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedKey(true);
      onShowToast("Daftar kunci jawaban disalin ke clipboard!");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      onShowToast("Gagal menyalin kunci jawaban.");
    }
  };

  // Group questions by type for preview
  const pgList = questions.filter((q) => q.type === "PG");
  const pgkList = questions.filter((q) => q.type === "PGK");
  const bsList = questions.filter((q) => q.type === "BS");
  const matchList = questions.filter((q) => q.type === "Menjodohkan");
  const uraianList = questions.filter((q) => q.type === "Uraian");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)] no-print">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Download className="w-6 h-6 text-[var(--brand-lime)]" />
            F. Unduh Naskah Ujian
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Atur format naskah ujian, petunjuk pengerjaan, periksa pratinjau lembar soal, lalu unduh dokumen Word atau cetak langsung.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn_download_word_top"
            onClick={handleDownloadWord}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" /> Unduh Dokumen Word (.doc)
          </button>
          <button
            type="button"
            id="btn_print_pdf_top"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* 1. PENGATURAN FORMAT NASKAH UJIAN */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-5 no-print">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
            <Columns className="w-4 h-4 text-[var(--brand-lime)]" />
            Pengaturan Format Naskah Ujian
          </h3>
          <p className="text-xs text-[var(--ink-3)] mt-0.5">
            Pilih tata letak naskah soal yang diinginkan untuk pencetakan atau berkas dokumen Word.
          </p>
        </div>

        {/* 2 Layout Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: 2 Kolom */}
          <div
            id="card_format_2_kolom"
            onClick={() => onChangeSettings({ ...settings, layoutColumns: 2 })}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              layoutColumns === 2
                ? "border-[var(--brand-green)] bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-2)]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    layoutColumns === 2
                      ? "bg-[var(--brand-green)] text-white"
                      : "bg-[var(--surface-3)] text-[var(--ink-2)]"
                  }`}
                >
                  <Columns className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--ink)]">
                    Format 2 Kolom (Kompak)
                  </div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Hemat Kertas
                  </span>
                </div>
              </div>
              {layoutColumns === 2 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[var(--brand-green)] dark:text-[var(--brand-lime)] bg-white dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                  <Check className="w-3.5 h-3.5" /> Dipilih
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-2.5 leading-relaxed">
              Naskah soal dibagi menjadi dua kolom berdampingan. Menghemat kertas ujian secara optimal saat penggandaan naskah sekolah.
            </p>
          </div>

          {/* Card 2: 1 Kolom */}
          <div
            id="card_format_1_kolom"
            onClick={() => onChangeSettings({ ...settings, layoutColumns: 1 })}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              layoutColumns === 1
                ? "border-[var(--brand-green)] bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-2)]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    layoutColumns === 1
                      ? "bg-[var(--brand-green)] text-white"
                      : "bg-[var(--surface-3)] text-[var(--ink-2)]"
                  }`}
                >
                  <AlignJustify className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--ink)]">
                    Format 1 Kolom (Standar)
                  </div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                    Lebar Penuh
                  </span>
                </div>
              </div>
              {layoutColumns === 1 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[var(--brand-green)] dark:text-[var(--brand-lime)] bg-white dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                  <Check className="w-3.5 h-3.5" /> Dipilih
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-2.5 leading-relaxed">
              Naskah soal tersusun satu kolom penuh selebar halaman. Tata letak leluasa dan mudah dibaca, sangat nyaman untuk stimulus teks/wacana panjang.
            </p>
          </div>
        </div>

        {/* Detail Parameter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[var(--border)]">
          {/* Paper Size */}
          <div>
            <div className="text-xs font-semibold text-[var(--ink-2)] mb-2">Ukuran Kertas:</div>
            <div className="flex flex-wrap gap-1.5">
              {(["A4", "F4", "Letter"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, paperSize: sz })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    settings.paperSize === sz
                      ? "bg-[var(--btn-green)] text-white border-[var(--btn-green)]"
                      : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {sz === "F4" ? "F4 / Folio (21.5 × 33 cm)" : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Option Columns */}
          <div>
            <div className="text-xs font-semibold text-[var(--ink-2)] mb-2">Kolom Pilihan PG:</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { cols: 1 as const, label: "1 Kolom (Standar)" },
                { cols: 2 as const, label: "2 Kolom (Hemat Kertas)" },
                { cols: 4 as const, label: "Horizontal (4 Kolom)" },
              ].map((opt) => (
                <button
                  key={opt.cols}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, optionCols: opt.cols })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    settings.optionCols === opt.cols
                      ? "bg-[var(--btn-green)] text-white border-[var(--btn-green)]"
                      : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="text-xs font-semibold text-[var(--ink-2)] mb-2">Ukuran Huruf Soal:</div>
            <div className="flex flex-wrap gap-1.5">
              {([10, 11, 12] as const).map((fs) => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, fontSize: fs })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    settings.fontSize === fs
                      ? "bg-[var(--btn-green)] text-white border-[var(--btn-green)]"
                      : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {fs} pt
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-4 items-center">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={settings.includeKey}
              onChange={(e) => onChangeSettings({ ...settings, includeKey: e.target.checked })}
              className="rounded text-[var(--btn-green)] focus:ring-[var(--brand-lime)]"
            />
            Sertakan Lampiran Kunci Jawaban &amp; Kisi-Kisi
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={settings.includeLJK}
              onChange={(e) => onChangeSettings({ ...settings, includeLJK: e.target.checked })}
              className="rounded text-[var(--btn-green)] focus:ring-[var(--brand-lime)]"
            />
            Sertakan Lembar Jawaban Siswa (LJS)
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={settings.showBloomLevel}
              onChange={(e) => onChangeSettings({ ...settings, showBloomLevel: e.target.checked })}
              className="rounded text-[var(--btn-green)] focus:ring-[var(--brand-lime)]"
            />
            Tampilkan Kode Level Bloom [C1-C6] di Soal
          </label>
        </div>
      </div>

      {/* 2. PENGATURAN PETUNJUK UMUM PENGERJAAN */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-[var(--brand-lime)]" />
              Petunjuk Umum Pengerjaan
            </h3>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">
              Daftar petunjuk pengerjaan yang akan dicetak di bagian atas lembar soal sebelum butir soal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn_add_instruction"
              onClick={handleAddInstruction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Petunjuk
            </button>
            <button
              type="button"
              id="btn_reset_instruction"
              onClick={handleResetInstructions}
              title="Kembalikan petunjuk ke teks default"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition border border-[var(--border)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={showInstructions}
              onChange={(e) => onChangeSettings({ ...settings, showInstructions: e.target.checked })}
              className="rounded text-[var(--btn-green)] focus:ring-[var(--brand-lime)]"
            />
            Tampilkan Kotak Petunjuk Umum di Lembar Soal
          </label>

          <span className="text-[11px] font-medium text-[var(--ink-3)]">
            {instructions.length} Butir Petunjuk Aktif
          </span>
        </div>

        {showInstructions && (
          <div className="space-y-2.5">
            {instructions.map((inst, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[var(--surface-3)] text-[var(--ink-2)] font-bold text-xs flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={inst}
                  onChange={(e) => handleUpdateInstruction(index, e.target.value)}
                  placeholder={`Tuliskan petunjuk butir ke-${index + 1}...`}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-1 focus:ring-[var(--brand-lime)]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveInstruction(index)}
                  title="Hapus butir petunjuk ini"
                  className="p-2 text-[var(--ink-3)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {instructions.length === 0 && (
              <div className="text-center py-6 text-xs text-[var(--ink-3)] border border-dashed border-[var(--border)] rounded-lg">
                Belum ada butir petunjuk umum. Klik tombol <span className="font-semibold text-[var(--ink)]">"+ Tambah Petunjuk"</span> di atas.
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUICK UTILITY ACTION BUTTONS */}
      <div className="bg-[var(--surface)] p-3.5 sm:p-4 rounded-xl border border-[var(--border)] shadow-xs flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyRawText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition border border-[var(--border)] cursor-pointer"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedText ? "Tersalin!" : "Salin Naskah Teks"}
          </button>

          <button
            type="button"
            onClick={handleCopyKeyAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition border border-[var(--border)] cursor-pointer"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-green-600" /> : <FileText className="w-3.5 h-3.5" />}
            {copiedKey ? "Tersalin!" : "Salin Kunci Jawaban"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--ink-3)] font-medium">
          <span>Format: <b className="text-[var(--ink)]">{layoutColumns === 2 ? "2 Kolom (Kompak)" : "1 Kolom (Standar)"}</b></span>
          <span>•</span>
          <span className="font-mono text-[var(--ink)]">{questions.length} Butir Soal</span>
        </div>
      </div>

      {/* PAPER PREVIEW CONTAINER */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-bold text-[var(--ink)] no-print">
          <span>Pratinjau Lembar Naskah Ujian ({layoutColumns === 2 ? "Format 2 Kolom" : "Format 1 Kolom"}):</span>
          <span className="text-xs font-normal text-[var(--ink-3)]">
            Tampilan persis dengan hasil cetak / dokumen Word
          </span>
        </div>

        <div className="bg-white text-black p-6 sm:p-10 rounded-xl border border-[var(--border)] shadow-lg font-serif max-w-4xl mx-auto print-only-container">
          {/* KOP SURAT */}
          <div className="flex items-center justify-between gap-4 border-b-4 border-double border-black pb-3 mb-3">
            {kop.logoKiri ? (
              <img src={kop.logoKiri} alt="Logo Kiri" className="h-16 w-auto object-contain shrink-0" />
            ) : null}

            <div className="text-center flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-wider leading-tight">
                {kop.instansi || "PEMERINTAH PROVINSI / KABUPATEN"}
              </div>
              <div className="text-xs sm:text-sm font-bold leading-tight">
                {kop.dinas || "DINAS PENDIDIKAN"}
              </div>
              <div className="text-sm sm:text-base font-extrabold leading-tight mt-0.5">
                {kop.sekolah || "SMP NEGERI 3 BATAM"}
              </div>
              <div className="text-[11px] italic text-gray-700 mt-0.5 font-sans leading-tight">
                {kop.alamat || "Alamat Sekolah"}
              </div>
            </div>

            {kop.logoKanan ? (
              <img src={kop.logoKanan} alt="Logo Kanan" className="h-16 w-auto object-contain shrink-0" />
            ) : null}
          </div>

          {/* EXAM TITLE */}
          <div className="text-center my-3">
            <div className="text-sm sm:text-base font-bold uppercase tracking-wide">
              {kop.ujian || "ASESMEN SUMATIF AKHIR SEMESTER GANJIL"}
            </div>
            <div className="text-xs sm:text-sm font-bold">
              TAHUN PELAJARAN {kop.tahun || "2026/2027"}
            </div>
          </div>

          {/* METADATA TABLE */}
          <div className="border-y border-black py-2 mb-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <div className="flex">
                <span className="w-28 font-bold">Mata Pelajaran</span>
                <span className="mr-2">:</span>
                <span className="font-semibold">{kop.mapel || "-"}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Hari / Tanggal</span>
                <span className="mr-2">:</span>
                <span>{kop.tanggal || "-"}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Kelas / Tingkat</span>
                <span className="mr-2">:</span>
                <span>{kop.kelas || "-"}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Alokasi Waktu</span>
                <span className="mr-2">:</span>
                <span>{kop.waktu || "-"}</span>
              </div>
            </div>
          </div>

          {/* GENERAL INSTRUCTIONS (PETUNJUK UMUM) */}
          {showInstructions && instructions.length > 0 && (
            <div className="mb-5 text-[11px] font-sans border border-gray-300 p-2.5 rounded bg-gray-50/70 leading-relaxed avoid-break">
              <div className="font-bold uppercase tracking-wider mb-1 text-gray-900">
                PETUNJUK UMUM:
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-800">
                {instructions.map((ins, idx) => (
                  <li key={idx} className="leading-snug">
                    {ins}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* QUESTIONS CONTAINER (MULTI-COLUMN OR SINGLE-COLUMN) */}
          <div
            className={
              layoutColumns === 2
                ? "columns-1 sm:columns-2 gap-8 [column-rule:1px_solid_#e5e7eb] exam-col-2 print:columns-2"
                : "space-y-6 exam-col-1"
            }
          >
            {/* Section I: PG */}
            {pgList.length > 0 && (
              <div className="mb-6 avoid-break">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                  BAGIAN I: PILIHAN GANDA
                </div>
                <p className="text-xs italic text-gray-700 mb-3">
                  Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, D, atau E!
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                  {pgList.map((q) => (
                    <li key={q.id} className="pl-1 avoid-break mb-3">
                      <div>
                        {q.question}
                        {settings.showBloomLevel && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2">[{q.level}]</span>
                        )}
                      </div>
                      {q.image && (
                        <div className="my-2">
                          <img src={q.image} alt={`Stimulus ${q.no}`} className="max-h-36 rounded border border-gray-300" />
                        </div>
                      )}
                      {q.imagePrompt && !q.image && (
                        <div className="my-1 text-[11px] text-gray-600 italic">
                          [Stimulus visual: {q.imagePrompt}]
                        </div>
                      )}
                      {/* Options Grid */}
                      <div
                        className={`mt-2 gap-x-6 gap-y-1 ${
                          settings.optionCols === 2
                            ? "grid grid-cols-2"
                            : settings.optionCols === 4
                            ? "grid grid-cols-4"
                            : "space-y-1"
                        }`}
                      >
                        {[
                          { k: "A", v: q.a },
                          { k: "B", v: q.b },
                          { k: "C", v: q.c },
                          { k: "D", v: q.d },
                          { k: "E", v: q.e },
                        ]
                          .filter((o) => o.v && o.v.trim().length > 0)
                          .map((opt) => (
                            <div key={opt.k} className="flex items-start gap-1.5">
                              <span className="font-bold shrink-0">{opt.k}.</span>
                              <span>{opt.v}</span>
                            </div>
                          ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Section II: PGK */}
            {pgkList.length > 0 && (
              <div className="mb-6 avoid-break">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                  BAGIAN II: PILIHAN GANDA KOMPLEKS
                </div>
                <p className="text-xs italic text-gray-700 mb-3">
                  Pilihlah semua pernyataan yang benar (jawaban benar dapat lebih dari satu)!
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                  {pgkList.map((q) => (
                    <li key={q.id} className="pl-1 avoid-break mb-3">
                      <div>
                        {q.question}
                        {settings.showBloomLevel && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2">[{q.level}]</span>
                        )}
                      </div>
                      {q.image && (
                        <div className="my-2">
                          <img src={q.image} alt={`Stimulus ${q.no}`} className="max-h-36 rounded border border-gray-300" />
                        </div>
                      )}
                      <div className="mt-2 space-y-1">
                        {[
                          { k: "A", v: q.a },
                          { k: "B", v: q.b },
                          { k: "C", v: q.c },
                          { k: "D", v: q.d },
                          { k: "E", v: q.e },
                        ]
                          .filter((o) => o.v && o.v.trim().length > 0)
                          .map((opt) => (
                            <div key={opt.k} className="flex items-start gap-2">
                              <span className="inline-block w-4 h-4 border border-black rounded-xs shrink-0 mt-0.5" />
                              <span className="font-bold">{opt.k}.</span>
                              <span>{opt.v}</span>
                            </div>
                          ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Section III: BS */}
            {bsList.length > 0 && (
              <div className="mb-6 avoid-break">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                  BAGIAN III: BENAR / SALAH
                </div>
                <p className="text-xs italic text-gray-700 mb-3">
                  Tentukan apakah pernyataan berikut Benar (B) atau Salah (S)!
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-3 text-xs sm:text-sm leading-relaxed">
                  {bsList.map((q) => (
                    <li key={q.id} className="pl-1 avoid-break mb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {q.question}
                          {settings.showBloomLevel && (
                            <span className="text-[10px] text-gray-500 font-mono ml-2">[{q.level}]</span>
                          )}
                        </div>
                        <div className="flex gap-2 font-mono font-bold shrink-0">
                          <span className="px-2 py-0.5 border border-black rounded text-xs">[ B ]</span>
                          <span className="px-2 py-0.5 border border-black rounded text-xs">[ S ]</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Section IV: Menjodohkan */}
            {matchList.length > 0 && (
              <div className="mb-6 avoid-break">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                  BAGIAN IV: MENJODOHKAN
                </div>
                <p className="text-xs italic text-gray-700 mb-3">
                  Pasangkanlah pernyataan di kolom sebelah kiri dengan jawaban yang tepat di kolom sebelah kanan!
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-3 text-xs sm:text-sm leading-relaxed">
                  {matchList.map((q) => (
                    <li key={q.id} className="pl-1 avoid-break mb-2">
                      <div>
                        {q.question}
                        {settings.showBloomLevel && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2">[{q.level}]</span>
                        )}
                      </div>
                      {q.image && (
                        <div className="my-2">
                          <img src={q.image} alt={`Stimulus ${q.no}`} className="max-h-36 rounded border border-gray-300" />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Section V: Uraian */}
            {uraianList.length > 0 && (
              <div className="mb-6 avoid-break">
                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                  BAGIAN V: URAIAN / ESAI
                </div>
                <p className="text-xs italic text-gray-700 mb-3">
                  Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat!
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-4 text-xs sm:text-sm leading-relaxed">
                  {uraianList.map((q) => (
                    <li key={q.id} className="pl-1 avoid-break mb-3">
                      <div>
                        {q.question}
                        {settings.showBloomLevel && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2">[{q.level}]</span>
                        )}
                      </div>
                      {q.image && (
                        <div className="my-2">
                          <img src={q.image} alt={`Stimulus ${q.no}`} className="max-h-36 rounded border border-gray-300" />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* APPENDIX: KUNCI JAWABAN */}
          {settings.includeKey && (
            <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-400 page-break avoid-break">
              <div className="text-center font-bold text-sm sm:text-base uppercase tracking-wider mb-3">
                KUNCI JAWABAN &amp; KISI-KISI BUTIR SOAL
              </div>
              <table className="w-full text-xs border-collapse border border-black font-sans">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1.5 w-10 text-center">No</th>
                    <th className="border border-black p-1.5 w-16 text-center">Bentuk</th>
                    <th className="border border-black p-1.5 w-14 text-center">Level</th>
                    <th className="border border-black p-1.5 text-left">Kunci Jawaban / Pedoman Penskoran</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => (
                    <tr key={q.id}>
                      <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 text-center">{q.type}</td>
                      <td className="border border-black p-1 text-center font-mono">{q.level}</td>
                      <td className="border border-black p-1 font-semibold">{q.key || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* APPENDIX: LEMBAR JAWABAN SISWA (LJS) */}
          {settings.includeLJK && (
            <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-400 page-break avoid-break">
              <div className="border-2 border-black p-4 text-xs font-sans">
                <div className="text-center font-bold text-sm sm:text-base uppercase tracking-wider mb-2">
                  LEMBAR JAWABAN SISWA (LJS)
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3 pb-2 border-b border-black text-[11px]">
                  <div>Nama Lengkap : ....................................................</div>
                  <div>Kelas / Rombel : {kop.kelas || "...................................."}</div>
                  <div>Nomor Peserta : ....................................................</div>
                  <div>Hari / Tanggal : {kop.tanggal || "...................................."}</div>
                </div>
                <div className="text-[11px] font-bold mb-2">
                  PILIHAN GANDA (Beri tanda silang X pada huruf yang dipilih):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
                  {Array.from({ length: Math.max(pgList.length, 10) }).map((_, idx) => (
                    <div key={idx} className="border border-black px-1.5 py-0.5 flex justify-between items-center">
                      <span className="font-bold">{idx + 1}.</span>
                      <span className="tracking-widest">A B C D E</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
