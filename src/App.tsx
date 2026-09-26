import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  PromptConfig,
  QuestionItem,
  KopData,
  ExportSettings,
} from "./types";
import { parseAITable, DEMO_TABLE_STRING } from "./utils/parser";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PromptStep from "./components/PromptStep";
import AIStep from "./components/AIStep";
import ImportStep from "./components/ImportStep";
import ReviewStep from "./components/ReviewStep";
import KopStep from "./components/KopStep";
import DownloadStep from "./components/DownloadStep";
import AccessGate from "./components/AccessGate";

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("siapajar_access_code") === "GURU_HEBAT";
    } catch {
      return false;
    }
  });

  const [currentTab, setCurrentTab] = useState<number>(() => {
    const saved = localStorage.getItem("siapajar_tab");
    return saved !== null ? parseInt(saved, 10) : 0;
  });

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
    localStorage.setItem("siapajar_tab", currentTab.toString());
  }, [currentTab]);

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
    setCurrentTab(0);
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

  const handleLockAccess = () => {
    try {
      localStorage.removeItem("siapajar_access_code");
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    showToast("Akses berhasil dikunci. Masukkan kode untuk membuka kembali.");
  };

  if (!isAuthenticated) {
    return <AccessGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] text-[var(--ink)] antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questions.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLockAccess={handleLockAccess}
      />

      {/* Main Content Area */}
      <div id="main" className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentTab={currentTab}
          onResetAll={handleResetAll}
          onLockAccess={handleLockAccess}
        />

        <div className="content-wrap flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {currentTab === 0 && (
                <PromptStep
                  config={promptConfig}
                  onChange={setPromptConfig}
                  onNext={() => setCurrentTab(1)}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 1 && (
                <AIStep
                  config={promptConfig}
                  onPrevStep={() => setCurrentTab(0)}
                  onImportQuestions={handleImportQuestions}
                  onGoToImport={() => setCurrentTab(2)}
                  onGoToReview={() => setCurrentTab(3)}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 2 && (
                <ImportStep
                  onImportQuestions={handleImportQuestions}
                  onGoToReview={() => setCurrentTab(3)}
                  onShowToast={showToast}
                  existingCount={questions.length}
                />
              )}

              {currentTab === 3 && (
                <ReviewStep
                  questions={questions}
                  onChangeQuestions={setQuestions}
                  onGoToKop={() => setCurrentTab(4)}
                  onGoToDownload={() => setCurrentTab(5)}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 4 && (
                <KopStep
                  kop={kopData}
                  onChangeKop={setKopData}
                  onNext={() => setCurrentTab(5)}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 5 && (
                <DownloadStep
                  questions={questions}
                  kop={kopData}
                  settings={exportSettings}
                  onChangeSettings={setExportSettings}
                  onShowToast={showToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Global Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-[#1B4332] text-white text-xs sm:text-sm font-semibold shadow-xl border border-white/20 z-50 animate-fade-in flex items-center gap-2"
        >
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
