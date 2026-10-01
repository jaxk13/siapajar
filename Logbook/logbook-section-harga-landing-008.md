# Logbook 008 — Section Harga di landing page

| | |
|---|---|
| Tanggal | 2026-09-30 |
| Fase | Phase 10 (frontend) |
| Status | Selesai |

## Permintaan
Pengguna bertanya mengapa harga belum tampil di landing page dan di mana seeder berada, lalu meminta section harga dibuat sekarang.

## Ringkasan
Section **Harga** (`/#harga`) membaca data dari `GET /api/plans`:
- kartu paket (harga, masa aktif, maks. 2 perangkat, fitur) dengan tombol **Beli via WhatsApp** berisi pesan otomatis;
- jika belum ada paket aktif: "Informasi harga segera tersedia" + tombol **Tanya Harga via WhatsApp**;
- langkah cara mendapatkan kode akses (`#kode-akses`) dan kotak kontak admin.
Menu "Kode Akses" di header/footer diganti **Harga**.

## Perubahan
### Dibuat
- `src/features/plans/{plansService.ts,PricingSection.tsx}`
### Diubah
- `src/pages/LandingPage.tsx`, `src/components/layout/{MarketingHeader,MarketingFooter}.tsx`
- `README.md`, `docs/TASKS.md`, `docs/API.md`

## Keputusan
- Harga tidak pernah di-hardcode di frontend; harga palsu tidak ditampilkan.

## Verifikasi
- Screenshot desktop & mobile untuk dua keadaan: tanpa paket aktif, dan dengan harga contoh (Rp25.000 / Rp75.000) yang dipasang sementara lalu dikembalikan. Tanpa scroll horizontal.
- `tsc`, `npm run build`: lolos.

## Catatan & hal yang masih terbuka
- **Insiden**: saat mengembalikan data uji, setting `admin_whatsapp` milik pengguna ikut terhapus. Sudah dipulihkan dengan `npm run db:seed` dari `ADMIN_WHATSAPP` di `.env` dan dicek tersimpan kembali.
- Pengguna kemudian mengaktifkan paket dengan harga masih Rp0, sehingga landing menampilkan "Rp 0" sampai harga diisi.
