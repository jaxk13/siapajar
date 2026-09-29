import { useEffect, useState } from "react";
import {
  PromptConfig,
  QuestionItem,
  KopData,
  ExportSettings,
} from "../types";
import { parseAITable, DEMO_TABLE_STRING } from "../features/import/parser";
import { useAccess } from "../features/access/AccessProvider";
import { Redirect, usePageTitle, useRouter } from "../lib/router";
import AppShell from "../components/layout/AppShell";
import PromptStep from "../components/PromptStep";
import AIStep from "../components/AIStep";
import ImportStep from "../components/ImportStep";
import ReviewStep from "../components/ReviewStep";
import KopStep from "../components/KopStep";
import DownloadStep from "../components/DownloadStep";
import AppHome from "./AppHome";

// Existing workflow screens, now addressed by URL instead of a stored tab index.
export const STEPS = [
  { path: "/app/parameter", label: "Parameter & Prompt", description: "Tentukan parameter soal dan salin prompt untuk AI" },
  { path: "/app/jalankan-ai", label: "Jalankan AI", description: "Jalankan prompt di AI pilihan Anda, lalu salin hasilnya" },
  { path: "/app/impor", label: "Impor Soal", description: "Tempel hasil AI untuk dibaca menjadi butir soal" },
  { path: "/app/editor", label: "Editor Naskah", description: "Periksa dan sunting soal, kunci jawaban, dan urutan" },
  { path: "/app/kop", label: "Kop Sekolah", description: "Identitas sekolah dan ujian untuk kepala naskah" },
  { path: "/app/export", label: "Unduh Naskah", description: "Unduh Word atau cetak/simpan sebagai PDF" },
] as const;

type StepPath = (typeof STEPS)[number]["path"];

const savedInitialJenjang = typeof window !== "undefined" ? localStorage.getItem("siapajar_jenjang") : null;

const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  jenjang: savedInitialJenjang || "SMP / MTs",
  kelas: "8",
  mapel: "Ilmu Pengetahuan Alam (IPA)",
  materi: "Sistem pernapasan manusia, organ respirasi, pertukaran gas di alveolus, enzim pencernaan, dan gerak refleks.",
  bukuSibi: "",
  typeCounts: {
    PG: 3,
    PGK: 1,
    Uraian: 1,
    BS: 2,
    Menjodohkan: 0,
  },
  difficulty: "Campuran",
  levels: ["C2", "C3", "C4"],
  catatan: "Gunakan konteks kehidupan sehari-hari dan stimulus analisis fenomena.",
};

const DEFAULT_KOP_DATA: KopData = {
  instansi: "PEMERINTAH KOTA BATAM",
  dinas: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
  sekolah: "SMP NEGERI 3 BATAM",
  alamat: "Jl. Raja Ali Haji No. 12, Sei Jodoh, Kota Batam • Telp. (0778) 456789",
  ujian: "ASESMEN SUMATIF AKHIR SEMESTER (SAS) GANJIL",
  tahun: "2026/2027",
  mapel: "Ilmu Pengetahuan Alam (IPA)",
  kelas: "VIII (Delapan)",
  tanggal: "Senin, 7 Desember 2026",
  waktu: "90 Menit (07.30 - 09.00 WIB)",
};

const DEFAULT_INSTRUCTIONS: string[] = [
  "Tulislah nama, nomor peserta, dan kelas Anda secara lengkap pada lembar jawaban yang tersedia!",
  "Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya!",
  "Dahulukan menjawab soal-soal yang Anda anggap mudah!",
  "Laporkan kepada pengawas ujian jika terdapat tulisan yang kurang jelas, rusak, atau jumlah soal kurang!",
  "Periksalah kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian!",
];

const DEFAULT_SETTINGS: ExportSettings = {
  layoutColumns: 2,
  paperSize: "A4",
  optionCols: 2,
  fontSize: 11,
  includeKey: true,
  includeLJK: false,
  showBloomLevel: false,
  showInstructions: true,
  instructions: DEFAULT_INSTRUCTIONS,
};

export default function AppPage({ path }: { path: string }) {
  const { navigate } = useRouter();
  const { logout } = useAccess();

  const [promptConfig, setPromptConfig] = useState<PromptConfig>(() => {
    try {
      const saved = localStorage.getItem("siapajar_prompt_config");
      const base = saved ? JSON.parse(saved) : DEFAULT_PROMPT_CONFIG;
      if (!base.difficulty) {
        base.difficulty = "Campuran";
      }
      const storedJenjang = localStorage.getItem("siapajar_jenjang");
      if (storedJenjang) {
        return { ...base, jenjang: storedJenjang };
      }
      return base;
    } catch {
      return DEFAULT_PROMPT_CONFIG;
    }
  });

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      const saved = localStorage.getItem("siapajar_questions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Initial demo seed
      return parseAITable(DEMO_TABLE_STRING).questions;
    } catch {
      return parseAITable(DEMO_TABLE_STRING).questions;
    }
  });

  const [kopData, setKopData] = useState<KopData>(() => {
    try {
      const saved = localStorage.getItem("siapajar_kop_data");
      return saved ? JSON.parse(saved) : DEFAULT_KOP_DATA;
    } catch {
      return DEFAULT_KOP_DATA;
    }
  });

  const [exportSettings, setExportSettings] = useState<ExportSettings>(() => {
    try {
      const saved = localStorage.getItem("siapajar_export_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          layoutColumns: parsed.layoutColumns || 2,
          instructions: Array.isArray(parsed.instructions) && parsed.instructions.length > 0 ? parsed.instructions : DEFAULT_INSTRUCTIONS,
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("siapajar_theme");
    return saved === "dark" ? "dark" : "light";
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("siapajar_prompt_config", JSON.stringify(promptConfig));
    if (promptConfig.jenjang) {
      localStorage.setItem("siapajar_jenjang", promptConfig.jenjang);
    }
  }, [promptConfig]);

  useEffect(() => {
    localStorage.setItem("siapajar_questions", JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem("siapajar_kop_data", JSON.stringify(kopData));
  }, [kopData]);

  useEffect(() => {
    localStorage.setItem("siapajar_export_settings", JSON.stringify(exportSettings));
  }, [exportSettings]);

  useEffect(() => {
    localStorage.setItem("siapajar_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    // Public pages (landing, masuk) always use the light theme.
    return () => document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  // Keep Kop metadata in sync with prompt when user types mapel / kelas
  useEffect(() => {
    setKopData((prev) => ({
      ...prev,
      mapel: promptConfig.mapel || prev.mapel,
      kelas: promptConfig.kelas || prev.kelas,
    }));
  }, [promptConfig.mapel, promptConfig.kelas]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleResetAll = () => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin mengatur ulang semua data (prompt, soal, dan pengaturan kop)? Soal demo standar akan dimuat ulang."
    );
    if (!confirmed) return;

    setPromptConfig(DEFAULT_PROMPT_CONFIG);
    const demo = parseAITable(DEMO_TABLE_STRING).questions;
    setQuestions(demo);
    setKopData(DEFAULT_KOP_DATA);
    setExportSettings(DEFAULT_SETTINGS);
    navigate(STEPS[0].path);
    showToast("Seluruh data telah diatur ulang ke kondisi awal.");
  };

  const handleImportQuestions = (newQuestions: QuestionItem[], append = false) => {
    if (append) {
      const startNo = questions.length + 1;
      const renumbered = newQuestions.map((q, idx) => ({ ...q, no: startNo + idx }));
      setQuestions((prev) => [...prev, ...renumbered]);
    } else {
      const renumbered = newQuestions.map((q, idx) => ({ ...q, no: idx + 1 }));
      setQuestions(renumbered);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/masuk", { replace: true });
  };

  const isHome = path === "/app";
  const step = STEPS.find((s) => s.path === path);
  usePageTitle(step ? step.label : "Beranda");

  if (!isHome && !step) {
    return <Redirect to="/app" />;
  }

  const go = (to: StepPath) => () => navigate(to);

  return (
    <AppShell
      currentPath={path}
      steps={STEPS.map((s) => ({
        path: s.path,
        label: s.label,
        count: s.path === "/app/editor" ? questions.length : undefined,
      }))}
      title={step ? step.label : "Beranda"}
      description={step ? step.description : "Ringkasan naskah yang sedang Anda susun"}
      theme={theme}
      onToggleTheme={handleToggleTheme}
      onResetData={handleResetAll}
      onLogout={handleLogout}
    >
      {isHome && (
        <AppHome
          questionCount={questions.length}
          subject={promptConfig.mapel}
          grade={promptConfig.kelas}
          steps={STEPS}
        />
      )}

      {path === "/app/parameter" && (
        <PromptStep
          config={promptConfig}
          onChange={setPromptConfig}
          onNext={go("/app/jalankan-ai")}
          onShowToast={showToast}
        />
      )}

      {path === "/app/jalankan-ai" && (
        <AIStep
          config={promptConfig}
          onPrevStep={go("/app/parameter")}
          onImportQuestions={handleImportQuestions}
          onGoToImport={go("/app/impor")}
          onGoToReview={go("/app/editor")}
          onShowToast={showToast}
        />
      )}

      {path === "/app/impor" && (
        <ImportStep
          onImportQuestions={handleImportQuestions}
          onGoToReview={go("/app/editor")}
          onShowToast={showToast}
          existingCount={questions.length}
        />
      )}

      {path === "/app/editor" && (
        <ReviewStep
          questions={questions}
          onChangeQuestions={setQuestions}
          onGoToKop={go("/app/kop")}
          onGoToDownload={go("/app/export")}
          onShowToast={showToast}
        />
      )}

      {path === "/app/kop" && (
        <KopStep
          kop={kopData}
          onChangeKop={setKopData}
          onNext={go("/app/export")}
          onShowToast={showToast}
        />
      )}

      {path === "/app/export" && (
        <DownloadStep
          questions={questions}
          kop={kopData}
          settings={exportSettings}
          onChangeSettings={setExportSettings}
          onShowToast={showToast}
        />
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-fg px-4 py-2.5 text-sm font-medium text-canvas shadow-overlay"
        >
          {toastMessage}
        </div>
      )}
    </AppShell>
  );
}
