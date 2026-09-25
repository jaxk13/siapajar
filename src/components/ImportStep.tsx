import { useState } from "react";
import { FileText, Play, RotateCcw, Trash2, ArrowRight, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { QuestionItem } from "../types";
import { parseAITable, DEMO_TABLE_STRING } from "../utils/parser";

interface ImportStepProps {
  onImportQuestions: (questions: QuestionItem[], append?: boolean) => void;
  onGoToReview: () => void;
  onShowToast: (msg: string) => void;
  existingCount: number;
}

export default function ImportStep({
  onImportQuestions,
  onGoToReview,
  onShowToast,
  existingCount,
}: ImportStepProps) {
  const [rawText, setRawText] = useState("");
  const [parseSummary, setParseSummary] = useState<{
    questions: QuestionItem[];
    warnings: string[];
  } | null>(null);

  const handleParse = () => {
    if (!rawText.trim()) {
      onShowToast("Silakan tempelkan tabel teks dari AI terlebih dahulu.");
      return;
    }

    const res = parseAITable(rawText);
    setParseSummary({
      questions: res.questions,
      warnings: res.warnings,
    });

    if (res.questions.length > 0) {
      onShowToast(`Ditemukan ${res.questions.length} butir soal yang valid!`);
    } else {
      onShowToast("Tidak ada butir soal yang valid ditemukan pada teks.");
    }
  };

  const handleFillDemo = () => {
    setRawText(DEMO_TABLE_STRING);
    const res = parseAITable(DEMO_TABLE_STRING);
    setParseSummary({
      questions: res.questions,
      warnings: res.warnings,
    });
    onShowToast("Contoh format tabel soal berhasil dimuat.");
  };

  const handleClear = () => {
    setRawText("");
    setParseSummary(null);
  };

  const handleApplyImport = (append: boolean) => {
    if (!parseSummary || parseSummary.questions.length === 0) return;
    onImportQuestions(parseSummary.questions, append);
    onShowToast(
      append
        ? `Menambahkan ${parseSummary.questions.length} butir soal ke daftar!`
        : `Menyimpan ${parseSummary.questions.length} butir soal baru!`
    );
    onGoToReview();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--brand-lime)]" />
            C. Impor Soal
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Tempel balasan tabel dari AI apa adanya. Pengurai cerdas akan memvalidasi kolom dan memetakan butir soal secara presisi.
          </p>
        </div>

        {existingCount > 0 && (
          <button
            type="button"
            onClick={onGoToReview}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Lihat {existingCount} Soal Tersimpan <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input Textarea Card */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="textarea_ai_table" className="text-sm font-bold text-[var(--ink)]">
            Tempelkan Tabel Balasan AI di Sini:
          </label>
          <span className="text-xs text-[var(--ink-3)] font-mono">Format: pipe-delimited (|) atau Markdown</span>
        </div>

        <textarea
          id="textarea_ai_table"
          rows={9}
          placeholder="tipe|soal|a|b|c|d|e|kunci|level|gambar
PG|Organ dalam sistem pernapasan manusia yang berfungsi sebagai...|Trakea|Bronkus|Alveolus|Laring|Faring|C|C1|-
Uraian|Jelaskan fungsi enzim ptialin dalam proses pencernaan!|-|-|-|-|-|Memecah amilum menjadi maltosa|C2|-"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 leading-relaxed resize-y"
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn_parse_table"
              onClick={handleParse}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4" /> Uraikan Tabel (Parse)
            </button>

            <button
              type="button"
              id="btn_load_demo"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition border border-[var(--border)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Muat Contoh Demo
            </button>

            <button
              type="button"
              id="btn_clear_input"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition border border-[var(--danger-bd)] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Kosongkan
            </button>
          </div>
        </div>
      </div>

      {/* Parse Result Summary */}
      {parseSummary && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              parseSummary.questions.length > 0
                ? "bg-[#EBF5F0] border-[var(--brand-lime)] text-[var(--ok)]"
                : "bg-[var(--danger-soft)] border-[var(--danger-bd)] text-[var(--danger)]"
            }`}
          >
            {parseSummary.questions.length > 0 ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[var(--btn-green)]" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold text-sm text-[var(--ink)]">
                {parseSummary.questions.length > 0
                  ? `Berhasil Menemukan ${parseSummary.questions.length} Butir Soal Valid`
                  : "Tidak Ada Butir Soal Valid yang Ditemukan"}
              </div>
              <p className="mt-0.5 text-[var(--ink-2)]">
                {parseSummary.questions.length > 0
                  ? "Periksa pratinjau tabel hasil uraian di bawah. Klik tombol untuk memasukkan soal ke daftar aktif Anda."
                  : "Pastikan teks berisi baris header 'tipe|soal|a|b|c|d|e|kunci|level|gambar' dan kolom dipisahkan oleh tanda pipa (|)."}
              </p>
            </div>
          </div>

          {/* Warnings if any */}
          {parseSummary.warnings.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[var(--warn-soft)] border border-amber-200 text-amber-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Catatan Hasil Analisis:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                {parseSummary.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parseSummary.questions.length > 0 && (
            <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                  <Eye className="w-4 h-4 text-[var(--brand-lime)]" />
                  Pratinjau Hasil Uraian ({parseSummary.questions.length} Butir)
                </div>

                <div className="flex items-center gap-2">
                  {existingCount > 0 && (
                    <button
                      type="button"
                      id="btn_apply_append"
                      onClick={() => handleApplyImport(true)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] cursor-pointer"
                    >
                      + Tambahkan ke Soal yang Ada
                    </button>
                  )}
                  <button
                    type="button"
                    id="btn_apply_replace"
                    onClick={() => handleApplyImport(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-xs cursor-pointer"
                  >
                    Gunakan &amp; Lanjut ke Tinjau <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-2)] text-[var(--ink-2)] border-b border-[var(--border)]">
                      <th className="p-2.5 font-bold w-10 text-center">No</th>
                      <th className="p-2.5 font-bold w-16">Tipe</th>
                      <th className="p-2.5 font-bold">Teks Pertanyaan</th>
                      <th className="p-2.5 font-bold w-20">Kunci</th>
                      <th className="p-2.5 font-bold w-16 text-center">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parseSummary.questions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-2)] transition">
                        <td className="p-2.5 text-center font-mono text-[var(--ink-3)]">{idx + 1}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#EBF5F0] text-[var(--btn-green)] border border-[var(--brand-lime)]/40">
                            {q.type}
                          </span>
                        </td>
                        <td className="p-2.5 max-w-md">
                          <div className="font-medium text-[var(--ink)] line-clamp-2">{q.question}</div>
                          {q.type === "PG" && (
                            <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                              A: {q.a} | B: {q.b} {q.c ? `| C: ${q.c}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[var(--btn-green)]">
                          {q.key || "-"}
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold text-[var(--ink-2)]">
                          {q.level}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
