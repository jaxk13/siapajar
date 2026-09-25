import { Trash2 } from "lucide-react";

interface TopbarProps {
  currentTab: number;
  onResetAll: () => void;
}

const TAB_TITLES: { title: string; sub: string }[] = [
  { title: "A. Buat Prompt Soal", sub: "Rakit perintah pembuatan instrumen soal berbasis HOTS" },
  { title: "B. Jalankan AI Generator", sub: "Gunakan AI Gemini instan atau platform AI eksternal" },
  { title: "C. Impor Soal", sub: "Uraikan tabel hasil balasan AI secara otomatis dan presisi" },
  { title: "D. Tinjau & Edit Soal", sub: "Koreksi butir pertanyaan, kunci jawaban, dan stimulus visual" },
  { title: "E. Kop Soal & Identitas", sub: "Format identitas lembaga dan kop surat resmi naskah ujian" },
  { title: "F. Unduh & Cetak Naskah", sub: "Ekspor dokumen Word (.doc), cetak langsung, atau simpan PDF" },
];

export default function Topbar({ currentTab, onResetAll }: TopbarProps) {
  const current = TAB_TITLES[currentTab] || TAB_TITLES[0];

  return (
    <header className="topbar h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-extrabold text-[var(--ink)] tracking-tight leading-tight truncate">
          {current.title}
        </h1>
        <p className="text-xs text-[var(--ink-3)] truncate hidden sm:block">
          {current.sub}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onResetAll}
          id="btn_reset_all_data"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-[var(--danger-bd)] transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Data</span>
        </button>
      </div>
    </header>
  );
}
