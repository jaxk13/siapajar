import { Sparkles, Bot, FileText, Edit3, School, Download, Moon, Sun, Lock } from "lucide-react";

interface SidebarProps {
  currentTab: number;
  onSelectTab: (tab: number) => void;
  questionCount: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLockAccess?: () => void;
}

const NAV_ITEMS = [
  { id: 0, label: "A. Buat Prompt", icon: Sparkles },
  { id: 1, label: "B. Jalankan AI", icon: Bot },
  { id: 2, label: "C. Impor Soal", icon: FileText },
  { id: 3, label: "D. Tinjau & Edit", icon: Edit3, hasBadge: true },
  { id: 4, label: "E. Kop Soal", icon: School },
  { id: 5, label: "F. Unduh Naskah", icon: Download },
];

export default function Sidebar({
  currentTab,
  onSelectTab,
  questionCount,
  theme,
  onToggleTheme,
  onLockAccess,
}: SidebarProps) {
  return (
    <aside
      id="sidebar"
      className="w-full md:w-64 shrink-0 bg-[#1B4332] text-white flex flex-col md:h-screen md:sticky top-0 z-40 overflow-y-auto"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 p-5 md:pt-6 md:pb-4 border-b border-white/10 md:border-b-0">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
          <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
            <circle cx="14" cy="14" r="12" fill="rgba(255,255,255,0.12)" />
            <path
              d="M9 14.5l3.5 3.5 6.5-7"
              stroke="#52B788"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="14" cy="14" r="11" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-lg text-white tracking-tight leading-none">
            Siapajar.id
          </div>
          <div className="text-[10px] font-bold tracking-widest text-[#74C69D] uppercase mt-1">
            Generator Soal
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase px-5 py-2 hidden md:block">
        Menu Penyusun
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-x-auto flex md:flex-col shrink-0 md:shrink">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer shrink-0 md:shrink text-left ${
                isActive
                  ? "bg-[#52B788] text-white font-bold shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isActive ? "bg-white/20" : "bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.hasBadge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    questionCount > 0
                      ? isActive
                        ? "bg-white text-[#1B4332]"
                        : "bg-[#52B788] text-white"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {questionCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="h-px bg-white/10 my-3 hidden md:block" />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition cursor-pointer text-left"
        >
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </div>
          <span className="flex-1 whitespace-nowrap">
            {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
          </span>
        </button>

        {/* Lock Access Button */}
        {onLockAccess && (
          <button
            type="button"
            onClick={onLockAccess}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium text-white/75 hover:bg-red-500/20 hover:text-red-200 transition cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <span className="flex-1 whitespace-nowrap">Kunci Akses</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
