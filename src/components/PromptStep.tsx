import { useState, useMemo } from "react";
import { Copy, Check, ArrowRight, Sparkles, BookOpen, Layers } from "lucide-react";
import { PromptConfig, BloomLevel, QuestionType } from "../types";

interface PromptStepProps {
  config: PromptConfig;
  onChange: (cfg: PromptConfig) => void;
  onNext: () => void;
  onShowToast: (msg: string) => void;
  onResetJenjang: () => void;
}

const BLOOM_LEVELS: { id: BloomLevel; label: string; desc: string }[] = [
  { id: "C1", label: "C1", desc: "Mengingat" },
  { id: "C2", label: "C2", desc: "Memahami" },
  { id: "C3", label: "C3", desc: "Menerapkan" },
  { id: "C4", label: "C4", desc: "Menganalisis" },
  { id: "C5", label: "C5", desc: "Mengevaluasi" },
  { id: "C6", label: "C6", desc: "Menciptakan" },
];

const QUESTION_TYPES: { id: QuestionType; label: string; desc: string }[] = [
  { id: "PG", label: "Pilihan Ganda (PG)", desc: "1 pilihan jawaban benar tunggal (A-D/E)" },
  { id: "PGK", label: "Pilihan Ganda Kompleks (PGK)", desc: "Pernyataan bercentang / jawaban benar jamak" },
  { id: "Uraian", label: "Uraian / Esai", desc: "Pertanyaan terbuka menuntut penalaran tertulis" },
  { id: "BS", label: "Benar / Salah (B/S)", desc: "Pernyataan konseptual Benar atau Salah" },
  { id: "Menjodohkan", label: "Menjodohkan", desc: "Memasangkan stimulus premis dengan respon" },
];

export default function PromptStep({
  config,
  onChange,
  onNext,
  onShowToast,
  onResetJenjang,
}: PromptStepProps) {
  const [copied, setCopied] = useState(false);

  const toggleLevel = (lvl: BloomLevel) => {
    const exists = config.levels.includes(lvl);
    const newLevels = exists
      ? config.levels.filter(l => l !== lvl)
      : [...config.levels, lvl].sort();
    onChange({ ...config, levels: newLevels });
  };

  const updateCount = (type: QuestionType, delta: number) => {
    const current = config.typeCounts[type] || 0;
    const nextVal = Math.max(0, current + delta);
    onChange({
      ...config,
      typeCounts: {
        ...config.typeCounts,
        [type]: nextVal,
      },
    });
  };

  const totalQuestions = useMemo(() => {
    return Object.values(config.typeCounts).reduce((a, b) => a + (b || 0), 0);
  }, [config.typeCounts]);

  const generatedPrompt = useMemo(() => {
    const typeItems = Object.entries(config.typeCounts)
      .filter(([, count]) => count > 0)
      .map(([t, count]) => `${count} butir soal ${t}`)
      .join(", ");

    const levelsStr = config.levels.length > 0 ? config.levels.join(", ") : "C2, C3, C4";

    return `Anda adalah pakar penyusun naskah soal asesmen dan kurikulum merdeka Indonesia yang teliti dan berstandar HOTS (Higher Order Thinking Skills).

TUGAS:
Buatkan naskah soal ujian berkualitas tinggi sesuai spesifikasi:
- Jenjang: ${config.jenjang}
- Kelas: ${config.kelas || "Standar"}
- Mata Pelajaran: ${config.mapel || "Mata Pelajaran Umum"}
- Level Kognitif (Taksonomi Bloom): ${levelsStr}
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
9. level: level kognitif (misal C2, C3, C4)
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--ink-2)]">
                Jenjang Pendidikan
              </label>
              <button
                type="button"
                id="btn_ganti_jenjang"
                onClick={onResetJenjang}
                className="text-xs font-semibold px-2.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:border-[#FF6600] hover:text-[#FF6600] transition cursor-pointer"
              >
                Ganti Jenjang
              </button>
            </div>
            <select
              id="select_jenjang"
              value={config.jenjang}
              disabled
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] opacity-75 cursor-not-allowed focus:outline-none"
            >
              <option value="SD / MI">SD / MI</option>
              <option value="SD/MI">SD / MI (Sederajat)</option>
              <option value="SMP / MTs">SMP / MTs</option>
              <option value="SMP/MTs">SMP / MTs (Sederajat)</option>
              <option value="SMA / MA / SMK">SMA / MA / SMK</option>
              <option value="SMA/MA">SMA / MA (Sederajat)</option>
              <option value="SMK/MAK">SMK / MAK (Kejuruan)</option>
              {config.jenjang &&
                !["SD / MI", "SD/MI", "SMP / MTs", "SMP/MTs", "SMA / MA / SMK", "SMA/MA", "SMK/MAK"].includes(
                  config.jenjang
                ) && <option value={config.jenjang}>{config.jenjang}</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Kelas / Rombel
            </label>
            <input
              type="text"
              id="input_kelas"
              placeholder="Contoh: VIII (Delapan) / X MIPA 1"
              value={config.kelas}
              onChange={(e) => onChange({ ...config, kelas: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20"
            />
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
              Level Kognitif (Taksonomi Bloom)
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BLOOM_LEVELS.map((bl) => {
                const active = config.levels.includes(bl.id);
                return (
                  <button
                    key={bl.id}
                    type="button"
                    onClick={() => toggleLevel(bl.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-[#EBF5F0] border-[var(--btn-green)] text-[var(--btn-green)] font-semibold"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--brand-lime)]"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? "bg-[var(--btn-green)]" : "bg-neutral-300"}`} />
                    <span>{bl.label}</span>
                    <span className="text-[10px] opacity-75 hidden sm:inline">({bl.desc})</span>
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

        <div className="divide-y divide-[var(--border)]">
          {QUESTION_TYPES.map((qt) => {
            const count = config.typeCounts[qt.id] || 0;
            return (
              <div key={qt.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--ink)]">{qt.label}</div>
                  <div className="text-xs text-[var(--ink-3)]">{qt.desc}</div>
                </div>

                <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-2)]">
                  <button
                    type="button"
                    onClick={() => updateCount(qt.id, -1)}
                    disabled={count <= 0}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--ink-2)] hover:bg-[var(--surface-3)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={count}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      onChange({
                        ...config,
                        typeCounts: { ...config.typeCounts, [qt.id]: val },
                      });
                    }}
                    className="w-12 text-center text-sm font-semibold bg-transparent border-x border-[var(--border)] py-1 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateCount(qt.id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--ink-2)] hover:bg-[var(--surface-3)] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
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
