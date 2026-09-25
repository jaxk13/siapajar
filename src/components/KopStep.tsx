import { School, Image as ImageIcon, X, ArrowRight } from "lucide-react";
import { KopData } from "../types";

interface KopStepProps {
  kop: KopData;
  onChangeKop: (kop: KopData) => void;
  onNext: () => void;
  onShowToast: (msg: string) => void;
}

export default function KopStep({ kop, onChangeKop, onNext, onShowToast }: KopStepProps) {
  const updateField = (field: keyof KopData, val: string) => {
    onChangeKop({ ...kop, [field]: val });
  };

  const handleLogoUpload = (field: "logoKiri" | "logoKanan", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onShowToast("Ukuran logo maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateField(field, dataUrl);
      onShowToast(`Logo ${field === "logoKiri" ? "Kiri" : "Kanan"} berhasil diunggah.`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] flex items-center gap-2">
            <School className="w-6 h-6 text-[var(--brand-lime)]" />
            E. Kop Soal &amp; Identitas Sekolah
          </h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            Data ini akan dicetak di bagian kepala halaman pertama naskah ujian dengan format resmi bergaris ganda.
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
        >
          Lanjut ke Unduhan <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live Kop Preview Card */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-3">
        <div className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">
          Pratinjau Kop Surat Resmi
        </div>

        <div className="bg-white text-black p-4 rounded-lg border border-[var(--border)] shadow-inner font-serif">
          <div className="flex items-center justify-between gap-4 border-b-4 border-double border-black pb-3">
            {kop.logoKiri ? (
              <img src={kop.logoKiri} alt="Logo Kiri" className="h-14 w-auto object-contain shrink-0" />
            ) : (
              <div className="w-14 h-14 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0 font-sans">
                Logo 1
              </div>
            )}

            <div className="text-center flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-wider leading-tight">
                {kop.instansi || "PEMERINTAH DAERAH PROVINSI / KABUPATEN"}
              </div>
              <div className="text-xs sm:text-sm font-bold leading-tight">
                {kop.dinas || "DINAS PENDIDIKAN DAN KEBUDAYAAN"}
              </div>
              <div className="text-sm sm:text-base font-extrabold leading-tight mt-0.5">
                {kop.sekolah || "NAMA SATUAN PENDIDIKAN"}
              </div>
              <div className="text-[11px] italic text-gray-600 mt-0.5 font-sans leading-tight">
                {kop.alamat || "Alamat Lengkap Satuan Pendidikan, No. Telp & Kode Pos"}
              </div>
            </div>

            {kop.logoKanan ? (
              <img src={kop.logoKanan} alt="Logo Kanan" className="h-14 w-auto object-contain shrink-0" />
            ) : (
              <div className="w-14 h-14 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0 font-sans">
                Logo 2
              </div>
            )}
          </div>

          <div className="text-center mt-3">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wide">
              {kop.ujian || "ASESMEN SUMATIF AKHIR SEMESTER"}
            </div>
            <div className="text-xs font-bold">
              TAHUN PELAJARAN {kop.tahun || "2026/2027"}
            </div>
          </div>
        </div>
      </div>

      {/* Form Identitas Instansi */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="text-sm font-bold text-[var(--ink)]">Identitas Instansi &amp; Satuan Pendidikan</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Instansi Induk / Pemerintah
            </label>
            <input
              type="text"
              placeholder="PEMERINTAH PROVINSI KEPULAUAN RIAU"
              value={kop.instansi}
              onChange={(e) => updateField("instansi", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Dinas Pendidikan / Yayasan
            </label>
            <input
              type="text"
              placeholder="DINAS PENDIDIKAN"
              value={kop.dinas}
              onChange={(e) => updateField("dinas", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Nama Sekolah
            </label>
            <input
              type="text"
              placeholder="SMP NEGERI 3 BATAM"
              value={kop.sekolah}
              onChange={(e) => updateField("sekolah", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)] font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Alamat &amp; Kontak Sekolah
            </label>
            <input
              type="text"
              placeholder="Jl. Raja Ali Haji No. 12, Batam • Telp (0778) 456789"
              value={kop.alamat}
              onChange={(e) => updateField("alamat", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>
        </div>
      </div>

      {/* Detail Ujian */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="text-sm font-bold text-[var(--ink)]">Detail Pelaksanaan Ujian</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Jenis Asesmen / Ujian
            </label>
            <input
              type="text"
              placeholder="SUMATIF AKHIR SEMESTER (SAS) GANJIL"
              value={kop.ujian}
              onChange={(e) => updateField("ujian", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Tahun Pelajaran
            </label>
            <input
              type="text"
              placeholder="2026/2027"
              value={kop.tahun}
              onChange={(e) => updateField("tahun", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
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
              placeholder="Ilmu Pengetahuan Alam (IPA)"
              value={kop.mapel}
              onChange={(e) => updateField("mapel", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Kelas / Tingkat
            </label>
            <input
              type="text"
              placeholder="VIII (Delapan)"
              value={kop.kelas}
              onChange={(e) => updateField("kelas", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Hari dan Tanggal
            </label>
            <input
              type="text"
              placeholder="Senin, 7 Desember 2026"
              value={kop.tanggal}
              onChange={(e) => updateField("tanggal", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
              Alokasi Waktu
            </label>
            <input
              type="text"
              placeholder="90 Menit (07.30 - 09.00 WIB)"
              value={kop.waktu}
              onChange={(e) => updateField("waktu", e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-lime)]"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload Cards */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="text-sm font-bold text-[var(--ink)]">Logo Sekolah &amp; Lembaga</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Logo Kiri */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-4">
            {kop.logoKiri ? (
              <div className="relative">
                <img src={kop.logoKiri} alt="Logo Kiri" className="w-16 h-16 object-contain rounded bg-white p-1" />
                <button
                  type="button"
                  onClick={() => updateField("logoKiri", "")}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  title="Hapus Logo Kiri"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--ink-3)] bg-[var(--surface)]">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-xs font-bold text-[var(--ink)]">Logo Kiri (Pemda / Tut Wuri)</div>
              <div className="text-[11px] text-[var(--ink-3)] mb-2">Format PNG transparan</div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] cursor-pointer">
                Pilih Berkas Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload("logoKiri", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logo Kanan */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-4">
            {kop.logoKanan ? (
              <div className="relative">
                <img src={kop.logoKanan} alt="Logo Kanan" className="w-16 h-16 object-contain rounded bg-white p-1" />
                <button
                  type="button"
                  onClick={() => updateField("logoKanan", "")}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  title="Hapus Logo Kanan"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--ink-3)] bg-[var(--surface)]">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-xs font-bold text-[var(--ink)]">Logo Kanan (Logo Sekolah)</div>
              <div className="text-[11px] text-[var(--ink-3)] mb-2">Format PNG transparan</div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] cursor-pointer">
                Pilih Berkas Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload("logoKanan", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-[var(--btn-green)] text-white hover:bg-[var(--btn-green-h)] transition shadow-sm cursor-pointer"
        >
          Simpan dan Lanjut ke Unduhan Naskah <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
