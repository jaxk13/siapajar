import { useState, useMemo } from "react";
import {
  Edit3,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Image as ImageIcon,
  Check,
  X,
  Shuffle,
  Search,
  BookOpenCheck
} from "lucide-react";
import { QuestionItem, QuestionType, BloomLevel } from "../types";
import { questionsToTableString } from "../features/import/parser";

interface ReviewStepProps {
  questions: QuestionItem[];
  onChangeQuestions: (questions: QuestionItem[]) => void;
  onGoToKop: () => void;
  onGoToDownload: () => void;
  onShowToast: (msg: string) => void;
}

const ALL_TYPES: QuestionType[] = ["PG", "PGK", "Uraian", "BS", "Menjodohkan"];
const ALL_LEVELS: BloomLevel[] = ["C1", "C2", "C3", "C4", "C5", "C6"];

export default function ReviewStep({
  questions,
  onChangeQuestions,
  onGoToKop,
  onGoToDownload,
  onShowToast,
}: ReviewStepProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterType !== "ALL" && q.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.question.toLowerCase().includes(query);
        const matchesOpts = `${q.a} ${q.b} ${q.c} ${q.d} ${q.e}`.toLowerCase().includes(query);
        return matchesText || matchesOpts;
      }
      return true;
    });
  }, [questions, filterType, searchQuery]);

  const updateItem = (id: string, partial: Partial<QuestionItem>) => {
    onChangeQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...partial } : q))
    );
  };

  const deleteItem = (id: string) => {
    const updated = questions.filter((q) => q.id !== id).map((q, idx) => ({ ...q, no: idx + 1 }));
    onChangeQuestions(updated);
    onShowToast("Soal berhasil dihapus.");
  };

  const duplicateItem = (q: QuestionItem) => {
    const index = questions.findIndex((item) => item.id === q.id);
    const newItem: QuestionItem = {
      ...q,
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      question: `${q.question} (Salinan)`,
      no: index + 2,
    };
    const nextList = [...questions];
    nextList.splice(index + 1, 0, newItem);
    const renumbered = nextList.map((item, idx) => ({ ...item, no: idx + 1 }));
    onChangeQuestions(renumbered);
    onShowToast("Soal berhasil diduplikasi.");
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const nextList = [...questions];
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    const renumbered = nextList.map((q, idx) => ({ ...q, no: idx + 1 }));
    onChangeQuestions(renumbered);
  };

  const addNewQuestion = () => {
    const newItem: QuestionItem = {
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      no: questions.length + 1,
      type: "PG",
      question: "Tuliskan butir pertanyaan baru di sini...",
      a: "Pilihan A",
      b: "Pilihan B",
      c: "Pilihan C",
      d: "Pilihan D",
      e: "",
      key: "A",
      level: "C2",
    };
    onChangeQuestions([...questions, newItem]);
    onShowToast("Berhasil menambahkan 1 butir soal baru.");
  };

  const shuffleQuestions = () => {
    if (questions.length <= 1) return;
    const shuffled = [...questions].sort(() => Math.random() - 0.5).map((q, idx) => ({ ...q, no: idx + 1 }));
    onChangeQuestions(shuffled);
    onShowToast("Urutan soal berhasil diacak!");
  };

  const handleCopyTableString = async () => {
    const tableStr = questionsToTableString(questions);
    try {
      await navigator.clipboard.writeText(tableStr);
      onShowToast("Tabel seluruh soal disalin ke clipboard!");
    } catch {
      onShowToast("Gagal menyalin tabel.");
    }
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onShowToast("Ukuran gambar maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateItem(id, { image: dataUrl });
      onShowToast("Gambar stimulus berhasil disematkan ke soal.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-[var(--brand-lime)]" />
            D. Tinjau &amp; Edit Soal
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Sunting teks pertanyaan, tentukan kunci jawaban, unggah stimulus gambar, atau sesuaikan tingkat kognitif.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn_add_question_top"
            onClick={addNewQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Soal
          </button>
          <button
            type="button"
            id="btn_to_kop_step"
            onClick={onGoToKop}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Atur Kop Soal <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            id="btn_to_download_step"
            onClick={onGoToDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#EBF5F0] text-[var(--btn-green)] border border-[var(--brand-lime)] hover:bg-[#E2F0E8] transition cursor-pointer"
          >
            Unduh Naskah <BookOpenCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Toolbar Bar */}
      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[var(--ink-3)]">Filter Tipe:</span>
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
              filterType === "ALL"
                ? "bg-[var(--btn-green)] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
            }`}
          >
            Semua ({questions.length})
          </button>
          {ALL_TYPES.map((t) => {
            const count = questions.filter((q) => q.type === t).length;
            if (count === 0 && filterType !== t) return null;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filterType === t
                    ? "bg-[var(--btn-green)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Cari teks soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-full pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>

          <button
            type="button"
            onClick={shuffleQuestions}
            title="Acak Urutan Soal"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopyTableString}
            title="Salin Seluruh Soal sebagai Format Tabel"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {questions.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto text-[var(--ink-3)]">
            <Edit3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--ink)]">Belum Ada Soal di Dalam Daftar</h3>
          <p className="text-xs text-[var(--ink-3)] max-w-sm mx-auto">
            Anda dapat merakit soal dengan AI di Tab B, menempelkan tabel di Tab C, atau membuat soal baru secara manual.
          </p>
          <button
            type="button"
            onClick={addNewQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Buat Soal Pertama
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, qIndex) => {
          const actualIndex = questions.findIndex((item) => item.id === q.id);

          return (
            <div
              key={q.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-xs space-y-3 hover:border-[var(--border-2)] transition"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold text-xs flex items-center justify-center text-[var(--ink)]">
                    {q.no}
                  </span>

                  {/* Type Selector */}
                  <select
                    value={q.type}
                    onChange={(e) => updateItem(q.id, { type: e.target.value as QuestionType })}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-xs font-semibold text-[var(--ink-2)] focus:outline-none"
                  >
                    {ALL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  {/* Level Selector */}
                  <select
                    value={q.level}
                    onChange={(e) => updateItem(q.id, { level: e.target.value })}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-xs font-semibold text-[var(--ink-2)] focus:outline-none"
                  >
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Control Actions */}
                <div className="flex items-center gap-1 text-[var(--ink-3)]">
                  <button
                    type="button"
                    onClick={() => moveItem(actualIndex, -1)}
                    disabled={actualIndex === 0}
                    title="Pindahkan ke Atas"
                    className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(actualIndex, 1)}
                    disabled={actualIndex === questions.length - 1}
                    title="Pindahkan ke Bawah"
                    className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateItem(q)}
                    title="Duplikasi Soal"
                    className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--ink-2)] cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(q.id)}
                    title="Hapus Soal"
                    className="p-1 rounded hover:bg-[var(--danger-soft)] text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Teks Pertanyaan / Stimulus
                </label>
                <textarea
                  rows={3}
                  value={q.question}
                  onChange={(e) => updateItem(q.id, { question: e.target.value })}
                  placeholder="Ketikkan butir pertanyaan..."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-2 focus:ring-[var(--brand-lime)]/20 leading-relaxed resize-y"
                />
              </div>

              {/* Image Stimulus Section */}
              <div className="pt-1">
                {q.image ? (
                  <div className="relative inline-block border border-[var(--border)] rounded-lg p-1 bg-[var(--surface-2)]">
                    <img
                      src={q.image}
                      alt={`Stimulus Soal ${q.no}`}
                      className="max-h-36 rounded object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateItem(q.id, { image: undefined })}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
                      title="Hapus Gambar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" /> Unggah Gambar Stimulus
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(q.id, e)}
                        className="hidden"
                      />
                    </label>
                    {q.imagePrompt && (
                      <span className="text-xs text-[var(--ink-3)] italic">
                        Catatan ilustrasi: {q.imagePrompt}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Options / Answer Keys according to Question Type */}
              {q.type === "PG" && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <div className="text-xs font-semibold text-[var(--ink-2)]">
                    Pilihan Jawaban (Klik lingkaran untuk memilih Kunci Jawaban):
                  </div>
                  {[
                    { key: "A", field: "a" as const },
                    { key: "B", field: "b" as const },
                    { key: "C", field: "c" as const },
                    { key: "D", field: "d" as const },
                    { key: "E", field: "e" as const },
                  ].map((opt) => {
                    const isKey = q.key?.toUpperCase() === opt.key;
                    return (
                      <div key={opt.key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateItem(q.id, { key: opt.key })}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs transition cursor-pointer shrink-0 ${
                            isKey
                              ? "bg-[var(--btn-green)] text-white border-[var(--btn-green)] ring-2 ring-[var(--brand-lime)]/30"
                              : "bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border)] hover:border-[var(--brand-lime)]"
                          }`}
                        >
                          {opt.key}
                        </button>
                        <input
                          type="text"
                          value={q[opt.field]}
                          onChange={(e) => updateItem(q.id, { [opt.field]: e.target.value })}
                          placeholder={`Opsi ${opt.key}`}
                          className={`flex-1 bg-[var(--surface)] border rounded-md px-3 py-1.5 text-xs focus:outline-none ${
                            isKey
                              ? "border-[var(--btn-green)] font-semibold text-[var(--ink)]"
                              : "border-[var(--border)] text-[var(--ink-2)]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "PGK" && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <div className="text-xs font-semibold text-[var(--ink-2)]">
                    Pilihan Jawaban Kompleks (Centang semua jawaban yang benar):
                  </div>
                  {[
                    { key: "A", field: "a" as const },
                    { key: "B", field: "b" as const },
                    { key: "C", field: "c" as const },
                    { key: "D", field: "d" as const },
                    { key: "E", field: "e" as const },
                  ].map((opt) => {
                    const currentKeys = (q.key || "").split(/[,;\s]+/).map((k) => k.toUpperCase().trim());
                    const isChecked = currentKeys.includes(opt.key);

                    const togglePgkKey = () => {
                      const nextKeys = isChecked
                        ? currentKeys.filter((k) => k !== opt.key)
                        : [...currentKeys, opt.key].sort();
                      updateItem(q.id, { key: nextKeys.join(", ") });
                    };

                    return (
                      <div key={opt.key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={togglePgkKey}
                          className={`w-6 h-6 rounded border flex items-center justify-center font-bold text-xs transition cursor-pointer shrink-0 ${
                            isChecked
                              ? "bg-[var(--btn-green)] text-white border-[var(--btn-green)]"
                              : "bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border)] hover:border-[var(--brand-lime)]"
                          }`}
                        >
                          {isChecked ? <Check className="w-3.5 h-3.5" /> : opt.key}
                        </button>
                        <input
                          type="text"
                          value={q[opt.field]}
                          onChange={(e) => updateItem(q.id, { [opt.field]: e.target.value })}
                          placeholder={`Pernyataan ${opt.key}`}
                          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-1.5 text-xs text-[var(--ink)] focus:outline-none"
                        />
                      </div>
                    );
                  })}
                  <div className="text-[11px] text-[var(--ink-3)] font-mono">
                    Kunci terpilih: <span className="font-bold text-[var(--btn-green)]">{q.key || "Belum ada"}</span>
                  </div>
                </div>
              )}

              {q.type === "BS" && (
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <div className="text-xs font-semibold text-[var(--ink-2)]">Kunci Pernyataan Benar atau Salah:</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(q.id, { key: "Benar" })}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        q.key?.toLowerCase() === "benar"
                          ? "bg-[var(--btn-green)] text-white shadow-xs"
                          : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
                      }`}
                    >
                      ✓ Benar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(q.id, { key: "Salah" })}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        q.key?.toLowerCase() === "salah"
                          ? "bg-[var(--danger)] text-white shadow-xs"
                          : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
                      }`}
                    >
                      ✕ Salah
                    </button>
                  </div>
                </div>
              )}

              {(q.type === "Uraian" || q.type === "Menjodohkan") && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                    Pedoman Kunci Jawaban / Rubrik Penilaian:
                  </label>
                  <textarea
                    rows={2}
                    value={q.key}
                    onChange={(e) => updateItem(q.id, { key: e.target.value })}
                    placeholder="Tuliskan kata kunci jawaban atau poin rubrik penilaian..."
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--brand-lime)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border)] flex-wrap">
        <button
          type="button"
          onClick={addNewQuestion}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Butir Soal Baru
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToKop}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition cursor-pointer"
          >
            Lanjut ke E (Kop Soal) <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onGoToDownload}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
          >
            Lanjut ke F (Unduh Naskah) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
