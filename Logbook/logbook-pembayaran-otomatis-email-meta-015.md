# Logbook 015 — Pembayaran otomatis Midtrans, email kode akses, Meta Pixel

| | |
|---|---|
| Tanggal | 2026-10-04 |
| Fase | Phase 10B (PRD FR-P06, FR-P07, ADR-017) |
| Status | Selesai (kode); akun Midtrans/Meta dan SMTP production belum diisi |

## Permintaan
Pemilik produk ingin pembeli membayar lewat payment gateway, lalu **kode akses langsung dikirim ke email** pembeli dalam email HTML yang "hidup" (ada gambar dan kode akses, bukan teks saja). Selain itu, iklan Meta harus bisa dianalisis: berapa yang melihat, yang checkout tapi belum bayar, dan yang membeli. Setelah membandingkan Mayar, Scalev, Konvert, dan Midtrans, dipilih **Midtrans + SIAPAJAR + Meta Pixel/Conversions API + email**, dikerjakan dalam mode development.

## Ringkasan
- Landing page: tombol **Beli Sekarang** membuka form (nama, email, WhatsApp, persetujuan). Server membuat pesanan `pending` dan transaksi Midtrans Snap; pembeli membayar di popup Midtrans.
- Notifikasi Midtrans (`/api/payment/webhook`) diverifikasi tanda tangannya, lalu statusnya **selalu dicek ulang ke API Midtrans**. Jika lunas: kode akses dibuat, dikirim ke email, pesanan menjadi `fulfilled`, dan event `Purchase` dikirim ke Meta. Notifikasi ganda atau bersamaan tetap menghasilkan satu kode.
- Email HTML bergambar: logo dan banner ilustrasi (gambar inline `cid:`), kotak kode akses besar, tombol "Masuk ke SIAPAJAR", detail paket, 3 langkah mulai, peringatan kerahasiaan, kontak WA admin; responsif di HP; ada versi teks.
- Halaman `/pembayaran/selesai` memantau status sampai kode terkirim; `/kebijakan-privasi` ditambahkan dan dirujuk dari form.
- Meta Pixel hanya di halaman publik (PageView, ViewContent saat harga terlihat, InitiateCheckout, Purchase) + Conversions API dari server dengan event id yang sama. Sumber iklan (utm, fbclid) tersimpan per pesanan.
- Panel admin: filter status (Lunas / Menunggu bayar / Kedaluwarsa-gagal), email & sumber pembeli, riwayat pengiriman email, **Kirim ulang via email** (kode baru, email bisa diperbaiki), **Ingatkan via WhatsApp** untuk checkout yang belum dibayar, angka checkout di Ringkasan, peringatan pesanan lunas yang kodenya belum terkirim.
- Development: Mailpit di Docker menangkap semua email; `npm run payment:simulate` dan `npm run email:preview`.
- Tanpa key Midtrans, landing tetap memakai "Beli via WhatsApp" (alur lama menjadi cadangan).

## Perubahan
### Dibuat
- `server/db/migrations/003_automatic_payment.sql`
- `server/lib/midtrans.ts`, `server/lib/mailer.ts`, `server/lib/metaConversions.ts`
- `server/emails/accessCodeEmail.ts`, `server/emails/assets/` (`logo.svg`, `logo.png`, `hero.svg`, `hero.jpg`)
- `server/services/payment.service.ts`, `server/services/codeDelivery.service.ts`
- `server/repositories/deliveries.repository.ts`
- `server/controllers/payment.controller.ts`, `server/routes/payment.ts`
- `server/scripts/payment-cli.ts`
- `src/features/checkout/checkoutService.ts`, `src/features/checkout/CheckoutDialog.tsx`
- `src/features/tracking/metaPixel.ts`, `src/features/tracking/attribution.ts`
- `src/features/admin/ResendEmailButton.tsx`
- `src/pages/PaymentResultPage.tsx`, `src/pages/PrivacyPage.tsx`
### Diubah
- Backend: `config/env.ts`, `routes/index.ts`, `routes/superAdmin.ts`, `controllers/admin.controller.ts`, `services/adminAccess.service.ts` (ekspor pembuat kode, `expiresAt`), `services/adminPanel.service.ts`, `repositories/orders.repository.ts`, `repositories/audit.repository.ts`
- Frontend: `App.tsx`, `pages/LandingPage.tsx`, `features/plans/PricingSection.tsx`, `components/layout/MarketingFooter.tsx`, `features/admin/adminApi.ts`, `features/admin/format.ts`, `features/admin/OrderList.tsx`, `pages/admin/OrdersPage.tsx`, `pages/admin/OrderDetailPage.tsx`, `pages/admin/AdminOverviewPage.tsx`, `pages/admin/OrderCreatePage.tsx`, `pages/admin/ActivityPage.tsx`
- `package.json` / `package-lock.json` (`nodemailer` ^10, script `payment:simulate`, `email:preview`), `docker-compose.yml` (Mailpit), `.env.example`
- Dokumen: `docs/PRD.md` (v2.3.0, FR-P02, FR-P06, FR-P07, FR-ADM, §26, §36), `docs/DECISIONS.md` (ADR-017, ADR-011), `docs/API.md`, `docs/DATABASE.md`, `docs/ERD.dbml`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md` (§15a-2), `docs/TASKS.md` (Phase 10B), `README.md`, `server/README.md`, `src/README.md`, `Logbook/README.md`
### Dihapus
- Tidak ada.

## Keputusan
- ADR-017: Midtrans Snap; status lunas hanya dari notifikasi bertanda tangan **dan** konfirmasi API Midtrans; idempoten lewat row lock + `access_codes.order_id` unik + `orders.provider_ref` unik.
- Email gagal tidak membatalkan pembayaran: pesanan tetap `paid`, admin mengirim ulang. Karena kode disimpan sebagai hash, kirim ulang selalu membuat kode baru.
- Dependency baru `nodemailer` (SMTP universal: Mailpit lokal, Resend/Brevo di production). Midtrans dan Meta memakai `fetch`, tanpa SDK.
- Halaman hasil pembayaran ikut menanyakan status ke Midtrans selama pesanan pending (dibatasi 5 detik per pesanan), sehingga sandbox bisa dicoba tanpa tunnel webhook.
- IP & user agent hanya disimpan sampai event `Purchase` terkirim / checkout ditutup; email & telepon ke Meta dalam bentuk hash.
- Panel admin hanya menampilkan angka & filter (bukan grafik), sesuai batasan FR-ADM; analisis iklan di Meta Ads Manager.
- Checkout menolak paket berharga 0.

## Verifikasi
- `npm run lint` (tsc) dan `npm run build`: lolos.
- `npm run db:migrate`: `003_automatic_payment.sql` diterapkan ke database lokal.
- `npm run payment:simulate -- --new --plan pro --email …`: pesanan → lunas → kode dibuat → email terkirim ke Mailpit (subjek, 2 gambar inline, teks berisi kode) → status `fulfilled`.
- Email dirender di Chrome headless: lebar desktop dan 375 px (HP). Versi pertama melebar di HP; diperbaiki (media query + `table-layout:fixed`) lalu dicek ulang.
- Endpoint diuji dengan curl (server port 3100, key Midtrans palsu): tanpa persetujuan → 400; email salah → 400; harga 0 → 400; paket tidak ada → 404; tanda tangan palsu → 403; tanda tangan sah untuk order uji dashboard → 200 `handled:false`; body kosong → 400; Midtrans menolak saat checkout → 502 dan pesanan `failed` (atribusi tersimpan, kunci asing dibuang); notifikasi bertanda tangan sah tetapi tidak dikonfirmasi Midtrans → 500 dan pesanan **tetap pending**.
- Dua simulasi pembayaran **bersamaan** untuk satu pesanan: 1 kode, 1 email, 1 log `order.paid`.
- Fungsi panel admin diuji langsung: filter `paid`/`unpaid`/`closed`, ringkasan, detail (atribusi, riwayat email, pesan pengingat WA), kirim ulang ke email baru (terkirim, email pesanan diperbarui, riwayat tercatat dengan nama admin).
- Screenshot Chrome headless: halaman hasil pembayaran (berhasil, gagal) dan section Harga dengan tombol "Beli Sekarang".
- Data uji dihapus dari database lokal dan Mailpit; harga paket dikembalikan ke 0.

## Catatan & hal yang masih terbuka
- **Belum diuji dengan Midtrans sandbox sungguhan dan Meta sungguhan** (belum ada key). Langkah: isi key sandbox, beri harga paket, bayar via simulator Midtrans; isi Pixel ID, token CAPI, dan test event code, lalu cek Test Events.
- Popup Snap dan form checkout belum dicoba interaktif di browser (hanya typecheck, build, dan screenshot statis).
- Teks kebijakan privasi perlu ditinjau secara hukum sebelum rilis.
- Production: key Midtrans production setelah verifikasi akun, SMTP dengan domain pengirim (SPF/DKIM), `APP_URL`, kosongkan `META_TEST_EVENT_CODE`.
- Refund/chargeback ditangani manual (nonaktifkan kode). Pengiriman kode lewat WhatsApp otomatis belum dibuat.
- Harga paket final masih belum diputuskan.
- Rencana Phase 2 (form parameter, keputusan Isian vs. Menjodohkan) masih menunggu persetujuan.
