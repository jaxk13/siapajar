# SIAPAJAR — Frontend (`src/`)

Frontend React yang dilayani oleh server Express yang sama (monolit). Dokumen ini adalah panduan perawatan frontend: routes, tugas setiap folder/file, data di browser, sistem desain, dan cara menambah atau mengubah sesuatu.

- Gambaran umum & cara menjalankan: [`README.md`](../README.md)
- Backend & API: [`server/README.md`](../server/README.md), [`docs/API.md`](../docs/API.md)
- Aturan UI/UX: [`docs/DESIGN.md`](../docs/DESIGN.md)
- Riwayat perubahan: [`Logbook/`](../Logbook/README.md)

---

## 1. Menjalankan

Frontend tidak dijalankan terpisah. Dari root proyek:

```bash
npm run dev      # frontend + API di http://localhost:3000 (Vite berjalan di dalam Express)
npm run lint     # cek tipe TypeScript
npm run build    # build frontend ke dist/ (+ server ke dist/server.cjs)
```

Halaman `/app/*` dan `/super-admin/*` membutuhkan backend + database. Lihat [`server/README.md`](../server/README.md) §2.

| Teknologi | Keterangan |
|---|---|
| React 19 + TypeScript | UI |
| Vite 8 | Dev server & build |
| Tailwind CSS 4 | Styling; token desain di `index.css` |
| lucide-react | Ikon |
| Router | Buatan sendiri (`lib/router.tsx`), tanpa library |

---

## 2. Routes (halaman)

### 2.1 Publik & guru

| URL | Komponen | Akses | Tugas |
|---|---|---|---|
| `/` | `pages/LandingPage.tsx` | Publik | Hero, masalah, cara kerja (`#cara-kerja`), hasil dokumen (`#hasil-dokumen`), harga (`#harga`), cara mendapatkan kode (`#kode-akses`), ajakan masuk |
| `/masuk` | `pages/AccessPage.tsx` | Publik | Form kode akses. Jika sesi aktif → `/app` |
| `/app` | `pages/AppPage.tsx` → `pages/AppHome.tsx` | Sesi guru | Ringkasan draf, alur penyusunan |
| `/app/parameter` | `AppPage` → `components/PromptStep.tsx` | Sesi guru | Parameter soal + prompt siap salin |
| `/app/jalankan-ai` | `AppPage` → `components/AIStep.tsx` | Sesi guru | Salin prompt, buka AI eksternal, tempel cepat hasil AI |
| `/app/impor` | `AppPage` → `components/ImportStep.tsx` | Sesi guru | Tempel hasil AI, parsing, peringatan baris bermasalah |
| `/app/editor` | `AppPage` → `components/ReviewStep.tsx` | Sesi guru | Edit, tambah, hapus, duplikasi, ubah urutan soal |
| `/app/kop` | `AppPage` → `components/KopStep.tsx` | Sesi guru | Kop sekolah & identitas ujian |
| `/app/export` | `AppPage` → `components/DownloadStep.tsx` | Sesi guru | Unduh Word, cetak/PDF, kertas & kolom |
| lainnya | `pages/NotFoundPage.tsx` | Publik | 404 (`/app/<tidak-dikenal>` → `/app`) |

Pengecekan akses guru (`App.tsx` + `features/access/AccessProvider.tsx`):

```
Buka halaman → AccessProvider memanggil GET /api/session
  "checking" → spinner (hanya /masuk dan /app/*)
  "active"   → /app/* boleh dibuka; /masuk → /app
  "inactive" → /app/* → /masuk
```

Landing page tidak menunggu pengecekan sesi.

### 2.2 Panel admin (`/super-admin`)

Login dan sesi terpisah dari guru. Diatur di `pages/admin/AdminRoutes.tsx` + `features/admin/AdminProvider.tsx`.

| URL | Komponen | Peran | Tugas |
|---|---|---|---|
| `/super-admin/masuk` | `pages/admin/AdminLoginPage.tsx` | Publik | Login tim (email + password); tanpa registrasi |
| `/super-admin` | `pages/admin/AdminOverviewPage.tsx` | Admin | Ringkasan + pesanan terbaru |
| `/super-admin/pesanan` | `pages/admin/OrdersPage.tsx` | Admin | Daftar & cari pesanan (nama, WA, 4 karakter kode) |
| `/super-admin/pesanan/baru` | `pages/admin/OrderCreatePage.tsx` | Admin | Buat pesanan + unggah bukti → kode → Kirim via WhatsApp |
| `/super-admin/pesanan/:id` | `pages/admin/OrderDetailPage.tsx` | Admin | Detail, bukti transaksi, perangkat aktif, ganti/nonaktifkan kode |
| `/super-admin/kode` | `pages/admin/CodesPage.tsx` | Admin | Semua kode, filter status, kode uji (super admin) |
| `/super-admin/paket` | `pages/admin/PlansPage.tsx` | Super admin | Paket & harga |
| `/super-admin/tim` | `pages/admin/TeamPage.tsx` | Super admin | Tim admin |
| `/super-admin/pengaturan` | `pages/admin/SettingsPage.tsx` | Super admin | Nomor WA admin |
| `/super-admin/aktivitas` | `pages/admin/ActivityPage.tsx` | Super admin | Riwayat aktivitas |
| `/super-admin/akun` | `pages/admin/AccountPage.tsx` | Semua anggota | Profil & ganti password |

Guard: belum masuk → `/super-admin/masuk`; password sementara → hanya `/super-admin/akun`; peran `admin` membuka halaman super admin → `/super-admin`. Path lain yang tidak dikenal → `/super-admin`.

---

## 3. Struktur folder dan tugasnya

```
src/
├── main.tsx                   Entry point React
├── App.tsx                    Daftar route + pengecekan akses guru
├── index.css                  Token desain, tema gelap, fokus, reduced motion, aturan cetak
├── lib/                       router, apiClient
├── pages/                     halaman guru
├── pages/admin/               halaman panel admin + AdminRoutes
├── components/
│   ├── ui/                    komponen dasar yang dipakai ulang
│   ├── layout/                kerangka halaman (header, footer, shell, drawer)
│   └── *Step.tsx              layar langkah A–F (warisan prototipe)
├── features/
│   ├── access/                kode akses & sesi guru
│   ├── plans/                 harga & section Harga
│   ├── admin/                 API & komponen panel admin
│   ├── import/                parser hasil AI
│   └── export/                generator dokumen Word
└── types/                     tipe data soal, kop, pengaturan
```

### `lib/`

| File | Tugas |
|---|---|
| `router.tsx` | `RouterProvider`, `useRouter()` (`path`, `navigate`), `<Link to>`, `<Redirect to>`, `usePageTitle()`. Setelah pindah halaman, fokus dipindah ke `#main-content` |
| `apiClient.ts` | **Satu-satunya** tempat memanggil `fetch` ke `/api` (GET/POST/PATCH/PUT). Membaca format `{ success, data / error }` dan mengubah error jaringan menjadi pesan yang dapat dipahami |

### `pages/` (guru)

| File | Tugas |
|---|---|
| `LandingPage.tsx` | Konten landing page (PRD §3, §6, §9–16) + pratinjau kartu soal dan lembar naskah (statis) |
| `AccessPage.tsx` | Form kode akses, validasi, pesan error dari backend |
| `AppPage.tsx` | State draf (soal, kop, pengaturan, tema), simpan ke localStorage, pemetaan URL → layar langkah, Keluar & Atur ulang data |
| `AppHome.tsx` | Isi `/app`: ringkasan draf atau keadaan kosong, daftar alur |
| `NotFoundPage.tsx` | 404 |

### `pages/admin/`

| File | Tugas |
|---|---|
| `AdminRoutes.tsx` | Route `/super-admin/*` + guard (login, password sementara, peran) |
| `AdminLoginPage.tsx` | Form login tim |
| `AdminOverviewPage.tsx` | Angka ringkasan + pesanan terbaru; tombol `NewOrderButton` |
| `OrdersPage.tsx` | Daftar & pencarian pesanan |
| `OrderCreatePage.tsx` | Form pesanan (paket, pembeli, transfer/QRIS, unggah bukti) → panel kode baru |
| `OrderDetailPage.tsx` | Detail pesanan, kode, perangkat, bukti transaksi |
| `CodesPage.tsx` | Daftar kode + filter + aksi; dialog kode uji |
| `PlansPage.tsx` | Form per paket (harga, masa aktif, batas perangkat, tampil/tidak) |
| `TeamPage.tsx` | Daftar anggota, tambah/ubah, reset password, tampilan password sementara |
| `SettingsPage.tsx` | Nomor WA admin |
| `ActivityPage.tsx` | Riwayat aktivitas |
| `AccountPage.tsx` | Profil & ganti password (wajib untuk password sementara) |

### `components/ui/` (komponen dasar)

Gunakan komponen ini sebelum membuat style baru.

| Komponen | Pakai untuk |
|---|---|
| `Button` + `buttonClasses()` | Tombol: `primary`, `secondary`, `ghost`, `danger`; `sm`/`md`/`lg`; `loading`. `buttonClasses()` untuk `<Link>`/`<a>` bergaya tombol |
| `Input`, `Select`, `Textarea` | Kolom isian dengan status `invalid` |
| `FormField` | Label + hint + error, sekaligus menghubungkan `aria-describedby` |
| `Alert` | Pesan `danger`, `success`, `info` (ikon + teks) |
| `Badge` | Label kecil: `neutral`, `brand`, `outline`, `danger` |
| `Dialog` | Modal berbasis `<dialog>` (fokus terkunci, Esc menutup) untuk konfirmasi |
| `EmptyState` | Keadaan kosong |
| `PageHeader` | Judul halaman di dalam app guru |
| `Container` | Lebar konten: `marketing` 1120px, `content` 960px, `narrow` 400px |
| `Logo` | Logo + wordmark SIAPAJAR |

### `components/layout/`

| File | Tugas |
|---|---|
| `MarketingHeader.tsx` | Header landing + menu mobile (`NAV_LINKS`) |
| `MarketingFooter.tsx` | Footer landing |
| `AuthLayout.tsx` | Kerangka `/masuk`, `/super-admin/masuk`, dan 404 |
| `AppShell.tsx` | Kerangka `/app`: sidebar, drawer, topbar "Aktif hingga …" |
| `AdminShell.tsx` | Kerangka panel admin: sidebar (`MAIN_NAV`, `SUPER_NAV`), drawer, topbar dengan tombol aksi |
| `MobileDrawer.tsx` | Menu samping HP/tablet (dipakai kedua shell) |
| `SkipLink.tsx` | "Lewati ke konten utama" untuk pengguna keyboard |

> ⚠️ `AppShell` sengaja memakai `id="sidebar"`, `class="topbar"`, `id="main"`, dan `class="content-wrap"`. Aturan cetak di `index.css` bergantung pada nama-nama ini. Jangan diganti tanpa mengubah aturan cetaknya.

### `components/*Step.tsx` (layar langkah)

Layar dari prototipe awal; belum memakai token desain baru dan dirapikan di fasenya masing-masing.

| File | Tugas | Fase |
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
| `access/accessService.ts` | `POST /api/access/activate`, `GET /api/session`, `POST /api/session/logout` |
| `access/AccessProvider.tsx` | State akses guru: `status`, `session` (masa aktif, paket), `activate()`, `logout()` |
| `plans/plansService.ts` | `GET /api/plans`; format Rupiah & nomor WA; link WhatsApp |
| `plans/PricingSection.tsx` | Section Harga: kartu paket, Beli via WhatsApp, langkah pembelian, kontak admin |
| `admin/adminApi.ts` | Semua pemanggilan `/api/super-admin` + tipe datanya |
| `admin/AdminProvider.tsx` | State login admin, `handleAuthError()` (sesi habis / wajib ganti password), `useAdminQuery()` untuk memuat data halaman |
| `admin/components.tsx` | Status kode, panel kode baru (salin / kirim WA), pencarian, halaman, `Panel`, `Field`, loading/error |
| `admin/CodeActions.tsx` | Tombol + dialog **Ganti kode** dan **Nonaktifkan** |
| `admin/OrderList.tsx` | Daftar pesanan responsif |
| `admin/format.ts` | Format tanggal (WIB), Rupiah, WA; label status/peran/aktivitas; nama perangkat; baca file → base64 |
| `import/parser.ts` | Teks tabel hasil AI → data soal; data demo |
| `export/exportWord.ts` | File Word (`.doc`) dari data soal |

---

## 4. API yang dipakai frontend

Semua lewat `lib/apiClient.ts`. Kontrak: [`docs/API.md`](../docs/API.md).

| Endpoint | Dipanggil dari | Kapan |
|---|---|---|
| `GET /api/session` | `features/access/accessService.ts` | Saat aplikasi dibuka |
| `POST /api/access/activate` | `features/access/accessService.ts` | Submit `/masuk` |
| `POST /api/session/logout` | `features/access/accessService.ts` | Tombol Keluar (guru) |
| `GET /api/plans` | `features/plans/plansService.ts` | Section Harga |
| `/api/super-admin/*` | `features/admin/adminApi.ts` | Semua halaman `/super-admin` |

Token sesi guru dan admin ada di cookie HttpOnly. Frontend **tidak pernah** membaca atau menyimpan token.

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
| `siapajar_theme` | Tema terang/gelap aplikasi guru |

Key lama `siapajar_access_code` otomatis dihapus. Panel admin tidak menyimpan apa pun di localStorage.

> Rencana (PRD FR-G01): key akan diringkas menjadi `siapajar_current_draft`, `siapajar_school_header`, `siapajar_preferences` dengan versi skema.

---

## 6. Sistem desain (ringkas)

Detail: [`docs/DESIGN.md`](../docs/DESIGN.md) §5.

- Pakai kelas token, bukan warna hex: `bg-surface`, `bg-canvas`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line`, `bg-primary`, `text-primary-text`, `bg-danger-soft`, dll.
- Teks hijau → `text-primary-text` (bukan `text-primary`) agar kontras lolos.
- Sudut: `rounded-md` untuk kontrol, `rounded-lg` untuk panel. Tanpa tombol berbentuk pil. Ukuran teks minimal 12px.
- Bayangan: hanya `shadow-card` dan `shadow-overlay`.
- Landing, `/masuk`, dan panel admin selalu tema terang; mode gelap hanya di `/app`.
- Tindakan yang tidak bisa dibatalkan (nonaktifkan kode, ganti kode, reset password) selalu lewat `Dialog` konfirmasi.
- Data rahasia yang tampil sekali (kode akses baru, password sementara) ditampilkan dengan tombol salin dan peringatan "hanya sekali".
- Animasi seperlunya; otomatis dimatikan jika pengguna memilih "reduce motion".

---

## 7. Panduan perawatan

### Menambah halaman guru

1. Buat `pages/NamaHalaman.tsx`; panggil `usePageTitle("Judul")` dan beri `<main id="main-content" tabIndex={-1}>` (atau pakai layout yang sudah memilikinya).
2. Daftarkan URL di fungsi `Routes` pada `App.tsx`; tentukan apakah perlu sesi.
3. Link memakai `<Link to="/url">`, bukan `<a href>`.

### Menambah langkah di `/app`

1. Tambahkan objek di `STEPS` (`pages/AppPage.tsx`): `path`, `label`, `description`.
2. Render komponennya di `AppPage` dengan `path === "/app/..."`.
3. Sidebar, drawer, dan daftar alur di beranda otomatis ikut.

### Menambah halaman panel admin

1. Buat `pages/admin/NamaPage.tsx` dibungkus `<AdminShell title="...">`; muat data dengan `useAdminQuery(() => adminApi.xxx(), [deps])`.
2. Tambahkan fungsi API di `features/admin/adminApi.ts`.
3. Tambahkan `case` di `pages/admin/AdminRoutes.tsx`; jika khusus super admin, tambahkan path ke `SUPER_ADMIN_ONLY`.
4. Tambahkan menu di `MAIN_NAV` atau `SUPER_NAV` (`components/layout/AdminShell.tsx`).
5. Untuk aksi: panggil `handleAuthError(result)` dulu, lalu tampilkan `result.message` jika gagal.

### Memanggil endpoint API baru

1. Tulis fungsinya di `features/<fitur>/` memakai `apiRequest<T>()`. Jangan memanggil `fetch` langsung dari komponen.
2. Tampilkan `result.message` saat gagal; pesan dari backend sudah berbahasa Indonesia.

### Mengubah teks landing page

- Konten utama: `PROBLEMS`, `STEPS`, `OUTPUTS` di `pages/LandingPage.tsx`.
- Langkah pembelian: `PURCHASE_STEPS` di `features/plans/PricingSection.tsx`.
- Menu header: `NAV_LINKS` di `components/layout/MarketingHeader.tsx`.
- Jangan menambahkan statistik, testimoni, atau logo pelanggan yang tidak nyata.

### Mengubah harga atau nomor WA

Tidak ada di frontend. Ubah di panel admin (**Paket & Harga**, **Pengaturan**); section Harga membaca `GET /api/plans` secara otomatis.

### Checklist sebelum commit

- [ ] `npm run lint` dan `npm run build` lolos
- [ ] Dicek di desktop (1440px), tablet (820px), dan mobile (390px) tanpa scroll horizontal
- [ ] Bisa dipakai dengan keyboard (Tab, Enter, Esc) dan fokus terlihat
- [ ] Tidak ada warna hex baru; pakai token
- [ ] Dokumen ini diperbarui jika route atau struktur berubah, dan logbook baru dibuat

---

## 8. Catatan yang diketahui

- Layar `*Step.tsx` masih memakai gaya lama (variabel `--surface`, `--ink`, tombol pil). Dirapikan per fase.
- Paket npm `motion` masih terpasang tetapi sudah tidak dipakai kode; bisa dihapus.
- Sesi yang berakhir di tengah pemakaian baru terdeteksi saat halaman dimuat ulang atau saat memanggil API.
