import { useState, useMemo } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Bot,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PromptConfig, QuestionItem } from "../types";
import { parseAITable } from "../utils/parser";

export interface AIStepProps {
  config: PromptConfig;
  promptConfig?: PromptConfig; // compatibility alias
  onImportQuestions: (questions: QuestionItem[], append?: boolean) => void;
  onGoToImport: () => void;
  onGoToReview: () => void;
  onShowToast: (msg: string) => void;
  onPrevStep?: () => void;
  onNextStep?: (aiResult: string) => void;
}

const AI_LINKS = [
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    badge: "OpenAI",
    bg: "hover:border-[#10A37F] hover:bg-[#10A37F]/5",
  },
  {
    name: "Google Gemini",
    url: "https://gemini.google.com",
    badge: "Google",
    bg: "hover:border-[#1A73E8] hover:bg-[#1A73E8]/5",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    badge: "Anthropic",
    bg: "hover:border-[#D97706] hover:bg-[#D97706]/5",
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    badge: "DeepSeek",
    bg: "hover:border-[#4F46E5] hover:bg-[#4F46E5]/5",
  },
];

export default function AIStep({
  config: propConfig,
  promptConfig,
  onImportQuestions,
  onGoToImport,
  onGoToReview,
  onShowToast,
  onPrevStep,
  onNextStep,
}: AIStepProps) {
  const config = promptConfig || propConfig;

  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<number | null>(null);
  const [quickPasteText, setQuickPasteText] = useState("");

  const totalQuestions = useMemo(() => {
    return Object.values(config.typeCounts).reduce((a, b) => a + (b || 0), 0);
  }, [config.typeCounts]);

  const typeSummaryStr = useMemo(() => {
    const active = Object.entries(config.typeCounts).filter(([, count]) => count > 0);
    if (active.length === 0) return `${totalQuestions || 5} butir soal PG`;
    return active.map(([type, count]) => `${count} butir ${type}`).join(", ");
  }, [config.typeCounts, totalQuestions]);

  const generatedPrompt = useMemo(() => {
    const levelsStr = config.levels.length > 0 ? config.levels.join(", ") : "C2, C3, C4";

    return `Anda adalah pakar penyusun naskah soal asesmen dan kurikulum merdeka Indonesia yang teliti dan berstandar HOTS (Higher Order Thinking Skills).

TUGAS:
Buatkan naskah soal ujian berkualitas tinggi sesuai spesifikasi:
- Jenjang: ${config.jenjang}
- Kelas: ${config.kelas || "Standar"}
- Mata Pelajaran: ${config.mapel || "Mata Pelajaran Umum"}
- Level Kognitif (Taksonomi Bloom): ${levelsStr}
- Komposisi Butir Soal: ${typeSummaryStr}
- Cakupan Materi / Indikator Capaian:
${config.materi.trim() || "Materi standar sesuai jenjang dan mata pelajaran di atas."}
${config.bukuSibi?.trim() ? `- Referensi Utama: Gunakan konteks, gaya bahasa, dan sudut pandang dari buku '${config.bukuSibi.trim()}' agar soal sesuai dengan kurikulum nasional.` : ""}
${config.catatan.trim() ? `- Catatan Tambahan: ${config.catatan.trim()}` : ""}

ATURAN STRUKTUR OUTPUT:
Balas HANYA dengan tabel data pipe-delimited (|) yang bersih TANPA kalimat pengantar apapun dan TANPA penutup.
Baris pertama WAJIB berupa header tepat seperti ini:
tipe|soal|a|b|c|d|e|kunci|level|gambar

Format kolom per baris:
1. tipe: "PG" / "PGK" / "Uraian" / "BS" / "Menjodohkan"
2. soal: teks butir pertanyaan/stimulus (tanpa menulis nomor angka di awal soal)
3. a: teks opsi A (jika tipe Uraian/BS, isi tanda -)
4. b: teks opsi B (jika tipe Uraian/BS, isi tanda -)
5. c: teks opsi C (jika tipe Uraian/BS, isi tanda -)
6. d: teks opsi D (jika jenjang SD hanya A-C atau Uraian, isi tanda -)
7. e: teks opsi E (jika jenjang SMP/SD atau Uraian, isi tanda -)
8. kunci: Kunci jawaban ("A" / "B,C" / "Benar" / kata kunci uraian)
9. level: level kognitif (misal C2, C3, C4)
10. gambar: "-" jika tanpa gambar, atau petunjuk deskripsi gambar stimulus misal "[Diagram siklus karbon]"`;
  }, [config, typeSummaryStr]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      onShowToast("Perintah prompt berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onShowToast("Gagal menyalin perintah secara otomatis.");
    }
  };

  const handleDirectGenerate = async () => {
    setIsGenerating(true);
    setApiError(null);
    setApiSuccess(null);

    try {
      const response = await fetch("/api/gemini/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jenjang: config.jenjang,
          kelas: config.kelas,
          mapel: config.mapel,
          materi: config.materi,
          bukuSibi: config.bukuSibi,
          typeCounts: config.typeCounts,
          levels: config.levels,
          catatan: config.catatan,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Gagal memproses soal melalui AI.");
      }

      const rawText = data.rawText || "";
      const { questions } = parseAITable(rawText);

      if (questions.length === 0) {
        throw new Error("AI berhasil merespons, namun tabel soal tidak dapat diparsing dengan benar.");
      }

      onImportQuestions(questions, false);
      setApiSuccess(questions.length);
      onShowToast(`Berhasil membuat ${questions.length} butir soal secara otomatis!`);

      if (onNextStep) {
        onNextStep(rawText);
      }
    } catch (err: any) {
      setApiError(err.message || "Terjadi kendala saat menghubungi layanan AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProcessQuickPaste = () => {
    if (!quickPasteText.trim()) {
      onShowToast("Tempelkan tabel hasil AI terlebih dahulu.");
      return;
    }

    const { questions, warnings } = parseAITable(quickPasteText);
    if (questions.length === 0) {
      onShowToast("Format tabel belum sesuai atau tidak ada baris soal yang terbaca.");
      return;
    }

    onImportQuestions(questions, false);
    onShowToast(`Berhasil memuat ${questions.length} butir soal!`);
    onGoToReview();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Bot className="w-6 h-6 text-[var(--brand-lime)]" />
            B. Jalankan AI
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Gunakan perintah siap pakai dengan AI web gratis (ChatGPT, Gemini, Claude, DeepSeek) atau jalankan langsung via API.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onPrevStep || (() => {})}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Parameter Soal
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin!" : "Salin Prompt"}
          </button>
        </div>
      </div>

      {/* Ringkasan Parameter */}
      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-xs">
        <div className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider mb-2">
          Ringkasan Parameter Soal (dari Langkah A)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[var(--ink-3)] block">Jenjang & Kelas:</span>
            <span className="font-semibold text-[var(--ink)]">{config.jenjang} - {config.kelas || "Standar"}</span>
          </div>
          <div>
            <span className="text-[var(--ink-3)] block">Mata Pelajaran:</span>
            <span className="font-semibold text-[var(--ink)]">{config.mapel}</span>
          </div>
          <div>
            <span className="text-[var(--ink-3)] block">Jumlah & Komposisi:</span>
            <span className="font-semibold text-[var(--ink)]">{typeSummaryStr}</span>
          </div>
          <div>
            <span className="text-[var(--ink-3)] block">Level Kognitif:</span>
            <span className="font-semibold text-[var(--ink)]">
              {config.levels.length > 0 ? config.levels.join(", ") : "C2, C3, C4"}
            </span>
          </div>
        </div>
      </div>

      {/* Kotak Prompt Siap Pakai */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-lime)]" />
            Perintah Prompt yang Siap Dijalankan:
          </span>
          <span className="text-xs font-mono text-[var(--ink-3)]">{generatedPrompt.length} karakter</span>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono text-[var(--ink-2)] max-h-56 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed select-all">
            {generatedPrompt}
          </pre>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin ke Clipboard!" : "Salin Perintah Prompt"}
          </button>

          <span className="text-xs text-[var(--ink-3)]">
            Tinggal salin dan tempelkan ke AI di bawah ini.
          </span>
        </div>
      </div>

      {/* Pilihan 1: Buka AI Favorit di Tab Baru (Manual - Sangat Direkomendasikan) */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--ink)]">
              Pilihan 1: Buka AI Web Gratis (Direkomendasikan - Bebas Kuota)
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              100% Gratis & Stabil
            </span>
          </div>
          <p className="text-xs text-[var(--ink-3)] mt-1">
            Klik tombol AI di bawah untuk membuka web AI favorit Anda, lalu tempelkan (Ctrl+V) perintah yang sudah disalin:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AI_LINKS.map((ai) => (
            <a
              key={ai.name}
              href={ai.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer group ${ai.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
                  {ai.badge}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[var(--ink-3)] group-hover:text-[var(--ink)] transition" />
              </div>
              <div className="font-bold text-sm text-[var(--ink)]">
                {ai.name}
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-1">
                Buka & tempel prompt
              </div>
            </a>
          ))}
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--ink-2)] flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-[var(--btn-green)] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
            i
          </div>
          <div className="leading-relaxed">
            <strong>Alur Mudah:</strong> Setelah AI selesai menyusun tabel soal, blok dan salin (Copy) tabel teks tersebut, lalu klik <strong>"Lanjut ke Impor Soal"</strong> di bawah untuk menempelkannya ke naskah ujian Anda.
          </div>
        </div>
      </div>

      {/* Pilihan 2: Generate Langsung via API */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              Pilihan 2: Generate Otomatis via API
            </h3>
            <p className="text-xs text-[var(--ink-3)] mt-1">
              Gunakan API server untuk menghasilkan butir soal langsung di dalam aplikasi tanpa perlu pindah tab browser.
            </p>
          </div>

          <button
            type="button"
            id="btn_direct_generate"
            disabled={isGenerating}
            onClick={handleDirectGenerate}
            className="px-6 py-2.5 rounded-full font-bold text-sm bg-[#FF6600] hover:bg-[#E05A00] text-white shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menghasilkan Soal...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Sekarang
              </>
            )}
          </button>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Layanan API Sedang Padat / Memerlukan Antrean
            </div>
            <p className="leading-relaxed text-amber-800">
              {apiError}
            </p>
            <p className="text-amber-900 font-semibold pt-1">
              💡 Solusi Instan: Salin perintah prompt di atas dan gunakan <strong>Pilihan 1 (ChatGPT / Gemini Web)</strong> yang gratis dan tanpa batasan antrean!
            </p>
          </div>
        )}

        {apiSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm">
                Berhasil merakit {apiSuccess} butir soal!
              </span>
            </div>
            <button
              type="button"
              onClick={onGoToReview}
              className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              Lihat di Langkah D (Tinjau Soal) →
            </button>
          </div>
        )}
      </div>

      {/* Tempel Cepat Hasil AI */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--brand-lime)]" />
            Sudah Dapat Hasil dari AI? Tempelkan Cepat di Sini:
          </span>
        </div>

        <textarea
          rows={3}
          placeholder="Tempelkan (Paste) tabel hasil jawaban dari ChatGPT / Gemini / Claude di sini..."
          value={quickPasteText}
          onChange={(e) => setQuickPasteText(e.target.value)}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 resize-y"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleProcessQuickPaste}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-xs cursor-pointer"
          >
            Impor Soal Ini & Lanjut ke Edit
          </button>

          <span className="text-xs text-[var(--ink-3)]">
            atau gunakan halaman lengkap di Langkah C.
          </span>
        </div>
      </div>

      {/* Navigasi Bawah */}
      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onPrevStep || (() => {})}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke A. Buat Prompt
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onGoToImport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Lanjut ke C. Impor Soal <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onGoToReview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            Langsung ke D. Tinjau Soal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
