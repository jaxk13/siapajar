import { useState } from "react";
import { Download, Printer, Copy, Check, FileText, CheckCircle2 } from "lucide-react";
import { QuestionItem, KopData, ExportSettings } from "../types";
import { generateWordDocument } from "../utils/exportWord";

interface DownloadStepProps {
  questions: QuestionItem[];
  kop: KopData;
  settings: ExportSettings;
  onChangeSettings: (settings: ExportSettings) => void;
  onShowToast: (msg: string) => void;
}

export default function DownloadStep({
  questions,
  kop,
  settings,
  onChangeSettings,
  onShowToast,
}: DownloadStepProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleDownloadWord = () => {
    if (questions.length === 0) {
      onShowToast("Belum ada butir soal untuk diunduh.");
      return;
    }
    generateWordDocument(questions, kop, settings);
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
  const uraianList = questions.filter((q) => q.type === "Uraian");
  const matchList = questions.filter((q) => q.type === "Menjodohkan");

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
            Atur tata letak kertas dan kolom, periksa pratinjau naskah, lalu unduh dokumen Word atau cetak PDF langsung.
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

      {/* Settings Panel */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4 no-print">
        <div className="text-sm font-bold text-[var(--ink)]">Format &amp; Pengaturan Dokumen</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Quick Utility Action Buttons */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
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

          <span className="text-xs text-[var(--ink-3)] font-mono">
            {questions.length} Butir Soal Terangkai
          </span>
        </div>
      </div>

      {/* PAPER PREVIEW CONTAINER */}
      <div className="space-y-2">
        <div className="text-sm font-bold text-[var(--ink)] no-print">
          Pratinjau Lembar Naskah Ujian (Siap Cetak):
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

          {/* GENERAL INSTRUCTIONS */}
          <div className="mb-5 text-[11px] font-sans border border-gray-300 p-2.5 rounded bg-gray-50/60 leading-relaxed">
            <div className="font-bold uppercase tracking-wider mb-1">PETUNJUK UMUM:</div>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-800">
              <li>Tulislah nama, nomor peserta, dan kelas Anda secara lengkap pada lembar jawaban yang tersedia!</li>
              <li>Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya!</li>
              <li>Dahulukan menjawab soal-soal yang Anda anggap mudah!</li>
              <li>Periksalah kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian!</li>
            </ol>
          </div>

          {/* SECTIONS */}
          {/* Section I: PG */}
          {pgList.length > 0 && (
            <div className="mb-6">
              <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                BAGIAN I: PILIHAN GANDA
              </div>
              <p className="text-xs italic text-gray-700 mb-3">
                Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, D, atau E!
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                {pgList.map((q) => (
                  <li key={q.id} className="pl-1">
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
            <div className="mb-6">
              <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                BAGIAN II: PILIHAN GANDA KOMPLEKS
              </div>
              <p className="text-xs italic text-gray-700 mb-3">
                Pilihlah semua pernyataan yang benar (jawaban benar dapat lebih dari satu)!
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                {pgkList.map((q) => (
                  <li key={q.id} className="pl-1">
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
            <div className="mb-6">
              <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                BAGIAN III: BENAR / SALAH
              </div>
              <p className="text-xs italic text-gray-700 mb-3">
                Tentukan apakah pernyataan berikut Benar (B) atau Salah (S)!
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-3 text-xs sm:text-sm leading-relaxed">
                {bsList.map((q) => (
                  <li key={q.id} className="pl-1">
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

          {/* Section IV: Uraian */}
          {uraianList.length > 0 && (
            <div className="mb-6">
              <div className="font-bold text-xs sm:text-sm uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
                BAGIAN IV: URAIAN / ESAI
              </div>
              <p className="text-xs italic text-gray-700 mb-3">
                Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat!
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-4 text-xs sm:text-sm leading-relaxed">
                {uraianList.map((q) => (
                  <li key={q.id} className="pl-1">
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

          {/* APPENDIX: KUNCI JAWABAN */}
          {settings.includeKey && (
            <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-400 page-break">
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
        </div>
      </div>
    </div>
  );
}
