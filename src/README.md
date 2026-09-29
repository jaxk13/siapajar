# SIAPAJAR — Frontend (`src/`)

Frontend React yang dilayani oleh server Express yang sama (monolit). Dokumen ini adalah panduan perawatan frontend: route, tugas setiap folder/file, dan cara menambah atau mengubah sesuatu.

- Backend: [`server/README.md`](../server/README.md)
- Gambaran umum proyek: [`README.md`](../README.md)
- Aturan UI/UX: [`docs/DESIGN.md`](../docs/DESIGN.md)

---

## 1. Menjalankan

Frontend tidak dijalankan terpisah. Dari root proyek:

```bash
npm run dev      # frontend + API di http://localhost:3000 (Vite berjalan di dalam Express)
npm run lint     # cek tipe TypeScript
npm run build    # build frontend ke dist/ (+ server ke dist/server.cjs)
```

Untuk bisa masuk ke `/app`, backend dan database harus berjalan. Lihat [`server/README.md`](../server/README.md) §2.

| Teknologi | Keterangan |
|---|---|
| React 19 + TypeScript | UI |
| Vite 8 | Dev server & build |
| Tailwind CSS 4 | Styling, token desain di `index.css` |
| lucide-react | Ikon |
| Router | Buatan sendiri (`lib/router.tsx`), tanpa library |

---

## 2. Routes (halaman)

| URL | Komponen | Akses | Tugas |
|---|---|---|---|
| `/` | `pages/LandingPage.tsx` | Publik | Landing page: hero, masalah, cara kerja (`#cara-kerja`), hasil dokumen (`#hasil-dokumen`), harga (`#harga`), cara mendapatkan kode (`#kode-akses`), ajakan masuk |
| `/masuk` | `pages/AccessPage.tsx` | Publik | Form kode akses. Jika sesi sudah aktif → dialihkan ke `/app` |
| `/app` | `pages/AppPage.tsx` → `pages/AppHome.tsx` | Perlu sesi | Beranda aplikasi: ringkasan draf, alur penyusunan |
| `/app/parameter` | `AppPage` → `components/PromptStep.tsx` | Perlu sesi | Parameter soal + prompt siap salin |
| `/app/jalankan-ai` | `AppPage` → `components/AIStep.tsx` | Perlu sesi | Salin prompt, buka AI eksternal, tempel cepat hasil AI |
| `/app/impor` | `AppPage` → `components/ImportStep.tsx` | Perlu sesi | Tempel hasil AI, parsing, peringatan baris bermasalah |
| `/app/editor` | `AppPage` → `components/ReviewStep.tsx` | Perlu sesi | Edit, tambah, hapus, duplikasi, ubah urutan soal |
| `/app/kop` | `AppPage` → `components/KopStep.tsx` | Perlu sesi | Kop sekolah & identitas ujian |
| `/app/export` | `AppPage` → `components/DownloadStep.tsx` | Perlu sesi | Unduh Word, cetak/PDF, pengaturan kertas & kolom |
| lainnya | `pages/NotFoundPage.tsx` | Publik | Halaman 404 |

`/app/<tidak-dikenal>` dialihkan ke `/app`.

### Cara kerja pengecekan akses

Diatur di `App.tsx` (fungsi `Routes`) bersama `features/access/AccessProvider.tsx`:

```
Buka halaman
  → AccessProvider memanggil GET /api/session
      status "checking" → tampil spinner (hanya untuk /masuk dan /app/*)
      status "active"   → /app/* boleh dibuka; /masuk dialihkan ke /app
      status "inactive" → /app/* dialihkan ke /masuk
```

Landing page (`/`) tidak menunggu pengecekan sesi.

---

## 3. Struktur folder dan tugasnya

```
src/
├── main.tsx                 Entry point React (render <App/>)
├── App.tsx                  Daftar route + pengecekan akses
├── index.css                Token desain, tema gelap, fokus, reduced motion, aturan cetak
├── lib/                     Utilitas lintas fitur
├── pages/                   Satu file per halaman / route
├── components/
│   ├── ui/                  Komponen dasar yang dipakai ulang
│   ├── layout/              Kerangka halaman (header, footer, shell)
│   └── *Step.tsx            Layar langkah penyusunan (warisan prototipe)
├── features/                Logika per fitur (pemanggilan API, parser, export)
└── types/                   Tipe data soal, kop, pengaturan
```

### `lib/`

| File | Tugas |
|---|---|
| `router.tsx` | `RouterProvider`, `useRouter()` (`path`, `navigate`), `<Link to>`, `<Redirect to>`, `usePageTitle()`. Setelah pindah halaman, fokus dipindah ke `#main-content` (aksesibilitas) |
| `apiClient.ts` | **Satu-satunya** tempat memanggil `fetch` ke `/api`. Membaca format `{ success, data / error }` dan mengubah error jaringan menjadi pesan yang dapat dipahami pengguna |

### `pages/`

| File | Tugas |
|---|---|
| `LandingPage.tsx` | Konten landing page (teks mengikuti PRD §3, §6, §9–16) + pratinjau kartu soal dan lembar naskah (statis) |
| `AccessPage.tsx` | Form kode akses, validasi kosong, pesan error dari backend, loading |
| `AppPage.tsx` | Semua state draf (soal, kop, pengaturan, tema), simpan ke localStorage, pemetaan URL → layar langkah, tombol Keluar & Atur ulang data |
| `AppHome.tsx` | Isi `/app`: ringkasan draf atau keadaan kosong, daftar alur penyusunan |
| `NotFoundPage.tsx` | 404 |

### `components/ui/` (komponen dasar)

Gunakan komponen ini sebelum membuat style baru.

| Komponen | Pakai untuk |
|---|---|
| `Button` + `buttonClasses()` | Tombol. Varian `primary`, `secondary`, `ghost`, `danger`; ukuran `sm`, `md`, `lg`; `loading`. `buttonClasses()` untuk `<Link>`/`<a>` yang tampil seperti tombol |
| `Input` | Input teks, dengan status `invalid` |
| `FormField` | Label + hint + pesan error, sekaligus menghubungkan `aria-describedby` |
| `Alert` | Pesan `danger`, `success`, `info` (selalu dengan ikon + teks) |
| `Badge` | Label kecil (tipe soal, level kognitif) |
| `EmptyState` | Keadaan kosong dengan ikon, judul, deskripsi, aksi |
| `PageHeader` | Judul halaman di dalam app |
| `Container` | Lebar konten: `marketing` 1120px, `content` 960px, `narrow` 400px |
| `Logo` | Logo + wordmark SIAPAJAR |

### `components/layout/`

| File | Tugas |
|---|---|
| `MarketingHeader.tsx` | Header landing page + menu mobile. Daftar menu di konstanta `NAV_LINKS` |
| `MarketingFooter.tsx` | Footer landing page |
| `AuthLayout.tsx` | Kerangka halaman `/masuk` dan 404 |
| `AppShell.tsx` | Kerangka `/app`: sidebar (desktop), drawer (tablet/mobile), topbar dengan "Aktif hingga …" |
| `SkipLink.tsx` | Link "Lewati ke konten utama" untuk pengguna keyboard |

> ⚠️ `AppShell` sengaja memakai `id="sidebar"`, `class="topbar"`, `id="main"`, dan `class="content-wrap"`. Aturan cetak di `index.css` bergantung pada nama-nama ini untuk menyembunyikan navigasi saat mencetak naskah. Jangan diganti tanpa mengubah aturan cetaknya.

### `components/*Step.tsx` (layar langkah)

Layar dari prototipe awal. Isinya belum mengikuti token desain baru dan akan dirapikan di fasenya masing-masing (lihat `docs/TASKS.md`).

| File | Tugas | Fase perbaikan |
|---|---|---|
| `PromptStep.tsx` | Form parameter + pembuat prompt | 2–3 |
| `AIStep.tsx` | Petunjuk AI eksternal + tempel cepat | 4 |
| `ImportStep.tsx` | Impor & parsing hasil AI | 5 |
| `ReviewStep.tsx` | Editor soal | 6 |
| `KopStep.tsx` | Kop sekolah | 7 |
| `DownloadStep.tsx` | Pratinjau cetak, unduh Word, cetak/PDF | 8 |

### `features/`

| File | Tugas |
|---|---|
| `access/accessService.ts` | Memanggil `POST /api/access/activate`, `GET /api/session`, `POST /api/session/logout` |
| `access/AccessProvider.tsx` | State akses global: `status` (`checking`/`active`/`inactive`), `session` (masa aktif, paket), `activate()`, `logout()` |
| `plans/plansService.ts` | Memanggil `GET /api/plans`; format Rupiah & nomor WA; membuat link WhatsApp |
| `plans/PricingSection.tsx` | Section Harga di landing page (kartu paket, tombol Beli via WhatsApp, kontak admin) |
| `import/parser.ts` | Mengubah teks tabel hasil AI menjadi data soal; data demo |
| `export/exportWord.ts` | Membuat file Word (`.doc`) dari data soal |

---

## 4. API yang dipakai frontend

Semua lewat `lib/apiClient.ts`. Kontrak lengkap: [`docs/API.md`](../docs/API.md).

| Endpoint | Dipanggil dari | Kapan |
|---|---|---|
| `GET /api/session` | `features/access/accessService.ts` | Saat aplikasi dibuka |
| `POST /api/access/activate` | `features/access/accessService.ts` | Submit form `/masuk` |
| `POST /api/session/logout` | `features/access/accessService.ts` | Tombol Keluar |
| `GET /api/plans` | `features/plans/plansService.ts` | Section Harga di landing page |

Token sesi ada di cookie HttpOnly. Frontend **tidak pernah** membaca atau menyimpan token.

---

## 5. Data di browser (localStorage)

Draf soal disimpan di browser, bukan di server (Local First, ADR-002). Diatur di `pages/AppPage.tsx`.

| Key | Isi |
|---|---|
| `siapajar_prompt_config` | Parameter soal |
| `siapajar_jenjang` | Jenjang terakhir |
| `siapajar_questions` | Daftar soal (draf) |
| `siapajar_kop_data` | Data kop sekolah |
| `siapajar_export_settings` | Pengaturan unduh/cetak |
| `siapajar_theme` | Tema terang/gelap aplikasi |

Key lama `siapajar_access_code` otomatis dihapus. Akses sekarang memakai sesi dari server.

> Rencana (PRD FR-G01): key akan diringkas menjadi `siapajar_current_draft`, `siapajar_school_header`, `siapajar_preferences` dengan versi skema.

---

## 6. Sistem desain (ringkas)

Detail: [`docs/DESIGN.md`](../docs/DESIGN.md) §5.1.

- Pakai kelas token, bukan warna hex: `bg-surface`, `bg-canvas`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line`, `bg-primary`, `text-primary-text`, `bg-danger-soft`, dll.
- Teks hijau → `text-primary-text` (bukan `text-primary`) agar kontras tetap lolos.
- Sudut: `rounded-md` untuk kontrol, `rounded-lg` untuk panel. Tidak memakai tombol berbentuk pil.
- Bayangan: hanya `shadow-card` dan `shadow-overlay`.
- Landing dan `/masuk` selalu tema terang. Mode gelap hanya di `/app`.
- Animasi seperlunya; semua otomatis dimatikan jika pengguna memilih "reduce motion".

---

## 7. Panduan perawatan

### Menambah halaman baru

1. Buat `pages/NamaHalaman.tsx`. Panggil `usePageTitle("Judul")`, dan beri `<main id="main-content" tabIndex={-1}>` (atau pakai layout yang sudah memilikinya).
2. Daftarkan URL-nya di fungsi `Routes` pada `App.tsx`. Tentukan apakah perlu sesi.
3. Link ke halaman itu memakai `<Link to="/url">` (bukan `<a href>`), supaya tidak memuat ulang halaman.
4. Tambahkan baris di tabel §2 dokumen ini.

### Menambah langkah di dalam `/app`

1. Tambahkan objek di konstanta `STEPS` (`pages/AppPage.tsx`): `path`, `label`, `description`.
2. Render komponennya di `AppPage` dengan kondisi `path === "/app/..."`.
3. Sidebar, drawer mobile, dan daftar alur di beranda otomatis ikut.

### Memanggil endpoint API baru

1. Tulis fungsinya di `features/<fitur>/<fitur>Service.ts` memakai `apiRequest<T>()`.
2. Jangan memanggil `fetch` langsung dari komponen.
3. Tampilkan `result.message` saat gagal. Pesan dari backend sudah berbahasa Indonesia dan ramah pengguna.

### Mengubah teks landing page

- Konten utama: array `PROBLEMS`, `STEPS`, `OUTPUTS` di `pages/LandingPage.tsx`.
- Langkah pembelian: `PURCHASE_STEPS` di `features/plans/PricingSection.tsx`.
- Menu header: `NAV_LINKS` di `components/layout/MarketingHeader.tsx`.
- Jangan menambahkan statistik, testimoni, atau logo pelanggan yang tidak nyata.

### Mengubah harga paket

Harga **tidak** ada di frontend. Ubah di `server/db/seeds/plans.ts`, lalu jalankan `npm run db:seed`. Section Harga membaca data dari `GET /api/plans` secara otomatis.

### Checklist sebelum commit

- [ ] `npm run lint` dan `npm run build` lolos
- [ ] Halaman dicek di lebar desktop (1440px) dan mobile (390px), tanpa scroll horizontal
- [ ] Bisa dipakai dengan keyboard (Tab, Enter, Esc) dan fokus terlihat
- [ ] Tidak ada warna hex baru; pakai token
- [ ] Dokumen ini diperbarui jika route atau struktur berubah

---

## 8. Catatan yang diketahui

- Layar `*Step.tsx` masih memakai gaya lama (variabel `--surface`, `--ink`, tombol pil). Dirapikan per fase.
- Paket npm `motion` sudah tidak dipakai di kode dan bisa dihapus.
- Sesi yang berakhir di tengah pemakaian baru terdeteksi saat halaman dimuat ulang; belum ada pengecekan berkala.
