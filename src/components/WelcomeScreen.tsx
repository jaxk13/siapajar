interface WelcomeScreenProps {
  onSelect: (jenjang: string) => void;
}

const JENJANG_OPTIONS = [
  "SD / MI",
  "SMP / MTs",
  "SMA / MA / SMK",
];

export default function WelcomeScreen({ onSelect }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen w-full bg-[#E4E5E8] flex flex-col items-center justify-center p-6 text-gray-900 selection:bg-[#FF6600] selection:text-white">
      <div className="w-full max-w-md mx-auto text-center flex flex-col items-center">
        {/* App Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Siapajar.id
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-gray-700 font-medium leading-relaxed max-w-sm">
          Selamat datang! Pilih jenjang pendidikan yang Anda ajar untuk menyesuaikan materi.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 w-full flex flex-col items-center gap-4">
          {JENJANG_OPTIONS.map((jenjang) => (
            <button
              key={jenjang}
              type="button"
              onClick={() => onSelect(jenjang)}
              className="w-full max-w-xs px-8 py-4 rounded-full bg-[#FF6600] hover:bg-[#E05A00] text-white text-base sm:text-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer flex items-center justify-center text-center active:scale-95"
            >
              {jenjang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
