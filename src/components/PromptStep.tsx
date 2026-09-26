import { useState, useMemo } from "react";
import { Copy, Check, ArrowRight, Sparkles, BookOpen, Layers } from "lucide-react";
import { PromptConfig, Difficulty, QuestionType } from "../types";

interface PromptStepProps {
  config: PromptConfig;
  onChange: (cfg: PromptConfig) => void;
  onNext: () => void;
  onShowToast: (msg: string) => void;
}

const DIFFICULTY_OPTIONS: { id: Difficulty; label: string; desc: string }[] = [
  { id: "Mudah", label: "Mudah", desc: "Konseptual dasar" },
  { id: "Sedang", label: "Sedang", desc: "Penerapan standar" },
  { id: "Sulit", label: "Sulit", desc: "HOTS & Penalaran" },
  { id: "Campuran", label: "Campuran", desc: "Kombinasi bertingkat" },
];

export default function PromptStep({
  config,
  onChange,
  onNext,
  onShowToast,
}: PromptStepProps) {
  const [copied, setCopied] = useState(false);

  const totalQuestions = useMemo(() => {
    return Object.values(config.typeCounts).reduce((a, b) => a + (b || 0), 0);
  }, [config.typeCounts]);

  const activeTypes = useMemo(() => {
    return (Object.entries(config.typeCounts) as [QuestionType, number][]).filter(
      ([, c]) => c > 0
    );
  }, [config.typeCounts]);

  const currentTypeMode = useMemo(() => {
    if (activeTypes.length === 1) return activeTypes[0][0];
    if (activeTypes.length === 0) return "PG";
    return "Campuran";
  }, [activeTypes]);

  const distributeForCampuran = (total: number): Record<QuestionType, number> => {
    const t = Math.max(1, total);
    if (t === 5) {
      return { PG: 3, PGK: 1, Uraian: 1, BS: 0, Menjodohkan: 0 };
    }
    const pg = Math.max(1, Math.round(t * 0.5));
    const pgk = Math.max(0, Math.round(t * 0.2));
    const uraian = Math.max(1, Math.round(t * 0.15));
    const bs = Math.max(0, t - pg - pgk - uraian);
    return {
      PG: pg,
      PGK: pgk,
      Uraian: uraian,
      BS: bs,
      Menjodohkan: 0,
    };
  };

  const handleTypeModeChange = (mode: string) => {
    const currentTotal = totalQuestions > 0 ? totalQuestions : 5;
    if (mode === "Campuran") {
      onChange({
        ...config,
        typeCounts: distributeForCampuran(currentTotal),
      });
    } else {
      const singleType = mode as QuestionType;
      onChange({
        ...config,
        typeCounts: {
          PG: singleType === "PG" ? currentTotal : 0,
          PGK: singleType === "PGK" ? currentTotal : 0,
          Uraian: singleType === "Uraian" ? currentTotal : 0,
          BS: singleType === "BS" ? currentTotal : 0,
          Menjodohkan: singleType === "Menjodohkan" ? currentTotal : 0,
        },
      });
    }
  };

  const handleTotalQuestionsChange = (newTotal: number) => {
    if (currentTypeMode === "Campuran") {
      onChange({
        ...config,
        typeCounts: distributeForCampuran(newTotal),
      });
    } else {
      onChange({
        ...config,
        typeCounts: {
          PG: currentTypeMode === "PG" ? newTotal : 0,
          PGK: currentTypeMode === "PGK" ? newTotal : 0,
          Uraian: currentTypeMode === "Uraian" ? newTotal : 0,
          BS: currentTypeMode === "BS" ? newTotal : 0,
          Menjodohkan: currentTypeMode === "Menjodohkan" ? newTotal : 0,
        },
      });
    }
  };

  const generatedPrompt = useMemo(() => {
    const typeItems = Object.entries(config.typeCounts)
      .filter(([, count]) => count > 0)
      .map(([t, count]) => `${count} butir soal ${t}`)
      .join(", ");

    const diffStr = config.difficulty || "Campuran";

    return `Anda adalah pakar penyusun naskah soal asesmen dan kurikulum merdeka Indonesia yang teliti dan berstandar HOTS (Higher Order Thinking Skills).

TUGAS:
Buatkan naskah soal ujian berkualitas tinggi sesuai spesifikasi:
- Jenjang: ${config.jenjang}
- Kelas: Kelas ${config.kelas || "8"}
- Mata Pelajaran: ${config.mapel || "Mata Pelajaran Umum"}
- Tingkat Kesulitan: ${diffStr}
- Komposisi Butir Soal: ${typeItems || `${totalQuestions || 5} butir soal PG`}
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
9. level: tingkat kesulitan atau level kognitif (misal ${diffStr === "Campuran" ? "Mudah, Sedang, atau Sulit" : diffStr})
10. gambar: "-" jika tanpa gambar, atau petunjuk deskripsi gambar stimulus misal "[Diagram siklus karbon]"`;
  }, [config, totalQuestions]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      onShowToast("Perintah berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast("Gagal menyalin perintah secara otomatis.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--brand-lime)]" />
            A. Buat Prompt Soal
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Tentukan kerangka ujian. Prompt berkaidah pedagogis HOTS siap pakai akan dirakit secara otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn_copy_prompt_top"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin!" : "Salin Perintah"}
          </button>
          <button
            type="button"
            id="btn_next_to_ai"
            onClick={onNext}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Lanjut ke B <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Identitas Ujian */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-[var(--brand-lime)]" />
          Identitas dan Cakupan Materi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Jenjang Pendidikan
            </label>
            <select
              id="select_jenjang"
              value={config.jenjang}
              onChange={(e) => onChange({ ...config, jenjang: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 cursor-pointer"
            >
              <option value="SD / MI">SD / MI</option>
              <option value="SMP / MTs">SMP / MTs</option>
              <option value="SMA / MA / SMK">SMA / MA / SMK</option>
              <option value="SMK / MAK">SMK / MAK (Kejuruan)</option>
              {config.jenjang &&
                !["SD / MI", "SMP / MTs", "SMA / MA / SMK", "SMK / MAK"].includes(
                  config.jenjang
                ) && <option value={config.jenjang}>{config.jenjang}</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Kelas
            </label>
            <select
              id="select_kelas"
              value={config.kelas}
              onChange={(e) => onChange({ ...config, kelas: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((num) => (
                <option key={num} value={num}>
                  Kelas {num}
                </option>
              ))}
              {config.kelas &&
                !Array.from({ length: 12 }, (_, i) => String(i + 1)).includes(config.kelas) && (
                  <option value={config.kelas}>Kelas {config.kelas}</option>
                )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Mata Pelajaran
            </label>
            <input
              type="text"
              id="input_mapel"
              placeholder="Contoh: Ilmu Pengetahuan Alam (IPA) / Matematika"
              value={config.mapel}
              onChange={(e) => onChange({ ...config, mapel: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Tingkat Kesulitan
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {DIFFICULTY_OPTIONS.map((diff) => {
                const active = (config.difficulty || "Campuran") === diff.id;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    id={`btn_diff_${diff.id.toLowerCase()}`}
                    onClick={() => onChange({ ...config, difficulty: diff.id })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-[#EBF5F0] border-[var(--btn-green)] text-[var(--btn-green)] shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--brand-lime)]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? "bg-[var(--btn-green)]" : "bg-neutral-300"
                      }`}
                    />
                    <span>{diff.label}</span>
                    <span className="text-[10px] opacity-75 hidden sm:inline">
                      ({diff.desc})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
            Cakupan Materi / Silabus / Capaian Pembelajaran (CP)
          </label>
          <textarea
            id="textarea_materi"
            rows={4}
            placeholder="Tempelkan silabus, materi pokok, bab, atau indikator soal yang diinginkan... Contoh: Sistem pencernaan manusia, organ dan fungsi kelenjar pencernaan, uji zat makanan dan enzim amilase."
            value={config.materi}
            onChange={(e) => onChange({ ...config, materi: e.target.value })}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
            Judul Buku Rujukan SIBI / Kemenag <span className="text-[var(--ink-3)] font-normal">(Opsional)</span>
          </label>
          <input
            type="text"
            id="input_buku_sibi"
            placeholder="Contoh: Buku Siswa IPA Kelas VIII Kurikulum Merdeka (Kemendikbudristek 2021) / Buku Akidah Akhlak Kemenag"
            value={config.bukuSibi || ""}
            onChange={(e) => onChange({ ...config, bukuSibi: e.target.value })}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20"
          />
        </div>
      </div>

      {/* Komposisi Tipe Soal */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[var(--brand-lime)]" />
            Tipe dan Jumlah Butir Soal
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EBF5F0] text-[var(--btn-green)] border border-[var(--brand-lime)]">
            Total: {totalQuestions} Butir Soal
          </span>
        </div>

        {/* Dropdown Tipe dan Jumlah Butir Soal Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Tipe Soal
            </label>
            <select
              id="select_tipe_soal"
              value={currentTypeMode}
              onChange={(e) => handleTypeModeChange(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 cursor-pointer"
            >
              <option value="PG">Pilihan Ganda (PG)</option>
              <option value="PGK">Pilihan Ganda Kompleks (PGK)</option>
              <option value="Uraian">Uraian / Esai</option>
              <option value="BS">Benar / Salah (B/S)</option>
              <option value="Menjodohkan">Menjodohkan</option>
              <option value="Campuran">Campuran (Kombinasi Beragam Tipe)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Jumlah Butir Soal
            </label>
            <select
              id="select_jumlah_soal"
              value={totalQuestions}
              onChange={(e) => handleTotalQuestionsChange(parseInt(e.target.value, 10))}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 cursor-pointer"
            >
              {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                <option key={num} value={num}>
                  {num} Butir Soal
                </option>
              ))}
              {!([5, 10, 15, 20, 25, 30, 35, 40, 45, 50].includes(totalQuestions)) && totalQuestions > 0 && (
                <option value={totalQuestions}>{totalQuestions} Butir Soal</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Catatan Tambahan */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs">
        <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
          Catatan Tambahan / Konteks Khusus <span className="text-[var(--ink-3)] font-normal">(Opsional)</span>
        </label>
        <textarea
          id="textarea_catatan"
          rows={2}
          placeholder="Contoh: Buat dengan konteks kearifan lokal pesisir nusantara; sertakan stimulus studi kasus; hindari rumus yang terlalu panjang."
          value={config.catatan}
          onChange={(e) => onChange({ ...config, catatan: e.target.value })}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 resize-y"
        />
      </div>

      {/* Prompt Hasil Rakitan */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--ink)]">Perintah (Prompt) yang Dihasilkan:</span>
          <span className="text-xs font-mono text-[var(--ink-3)]">{generatedPrompt.length} karakter</span>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono text-[var(--ink-2)] max-h-64 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed select-all">
            {generatedPrompt}
          </pre>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            type="button"
            id="btn_copy_prompt_bottom"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin ke Clipboard!" : "Salin Perintah Siap Pakai"}
          </button>

          <button
            type="button"
            id="btn_next_to_ai_bottom"
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Lanjut ke Langkah B (Jalankan AI) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
