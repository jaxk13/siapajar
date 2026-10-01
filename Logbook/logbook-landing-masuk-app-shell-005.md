# Logbook 005 — Sistem desain, landing page, halaman masuk, app shell

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Frontend dasar (persiapan Phase 1) |
| Status | Selesai |

## Permintaan
Membuat pengalaman frontend pertama: Landing Page, Login, Register, dan kerangka aplikasi setelah masuk, dengan desain orisinal yang tidak terlihat seperti template AI ("no AI slop"). Setelah klarifikasi, disetujui: **masuk hanya dengan kode akses, tanpa Register** (PRD §7, ADR-003).

## Ringkasan
- **Token desain** (Tailwind 4 `@theme`): skala hijau brand, warna semantik terang/gelap, fokus terlihat, reduced motion. Semua pasangan warna dihitung dan lolos WCAG AA.
- **Komponen dasar**: Button, Input, FormField, Alert, Badge, EmptyState, PageHeader, Container, Logo.
- **Router kecil** berbasis History API (tanpa dependency): `/`, `/masuk`, `/app`, `/app/*`, 404.
- **Landing page**: hero dengan pratinjau kartu soal, masalah yang diselesaikan (PRD §3), 6 langkah cara kerja (PRD §6), hasil dokumen dengan pratinjau lembar naskah. Tanpa statistik/testimoni palsu, tanpa gradien/blob.
- **Halaman `/masuk`**: form kode akses dengan pesan error dari PRD.
- **App shell**: sidebar desktop, drawer tablet/mobile (fokus terkunci, Esc menutup), beranda dengan ringkasan draf; layar A–F lama dipasang di dalam shell tanpa diubah isinya.

## Perubahan
### Dibuat
- `src/components/ui/*` (9 komponen), `src/components/layout/{MarketingHeader,MarketingFooter,AuthLayout,AppShell,SkipLink}.tsx`
- `src/lib/router.tsx`, `src/features/access/{accessService.ts,AccessProvider.tsx}` (pemeriksaan sementara di browser)
- `src/pages/{LandingPage,AccessPage,AppPage,AppHome,NotFoundPage}.tsx`
### Diubah
- `src/App.tsx` (menjadi daftar route), `src/index.css` (token)
- `docs/DESIGN.md` §5.1, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `README.md`
### Dihapus
- `src/components/{AccessGate,Sidebar,Topbar}.tsx`

## Keputusan
- Tidak ada halaman Register; tidak ada dependency router.
- `#sidebar`, `.topbar`, `#main`, `.content-wrap` dipertahankan agar aturan cetak naskah tetap bekerja.
- Tema gelap hanya di `/app`; landing dan `/masuk` selalu terang.

## Verifikasi
- `tsc --noEmit`, `npm run build`: lolos.
- Screenshot headless Chrome (desktop 1440, tablet 820, mobile 390): tanpa scroll horizontal (diukur lewat Chrome DevTools Protocol).
- Redirect `/app` tanpa akses → `/masuk`; error field tampil; drawer berfungsi.
- Emulasi media print: sidebar & topbar tersembunyi.

## Catatan & hal yang masih terbuka
- Layar A–F lama belum memakai gaya baru.
- Referensi sobatguru.id tidak dapat dipelajari (halaman dirender di klien).
