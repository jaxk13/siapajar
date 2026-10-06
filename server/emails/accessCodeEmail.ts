// HTML email that delivers an access code to the buyer (ADR-017).
// Email clients ignore <style> blocks and modern CSS, so the layout uses tables and inline styles.
// Images are attached inline (cid:) so they show without loading remote content.
// Source art: assets/logo.svg and assets/hero.svg (see server/README.md, "Email").
import path from "path";
import { env } from "../config/env";
import type { MailMessage } from "../lib/mailer";

const ASSETS = path.resolve("server/emails/assets");

const C = {
  brand: "#226a48",
  brandDark: "#164430",
  brandSoft: "#eef6f1",
  brandLine: "#aed5be",
  ink: "#1c2420",
  muted: "#4f5b55",
  subtle: "#7a857f",
  line: "#e3e8e5",
  canvas: "#f3f6f4",
  warnBg: "#fff8e6",
  warnLine: "#f0d58a",
  warnInk: "#6b5310",
};

const FONT = "'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

export interface AccessCodeEmailData {
  buyerName: string;
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  /** Set for a replacement code: the original expiry still applies. */
  expiresAt: Date | null;
  orderId: string;
  /** "purchase": first delivery after payment. "replacement": admin issued a new code. */
  reason: "purchase" | "replacement";
  adminWhatsappUrl: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function details(data: AccessCodeEmailData) {
  const period = data.expiresAt
    ? `Berlaku hingga ${formatDate(data.expiresAt)}`
    : `${data.durationDays} hari, dihitung sejak kode pertama kali dipakai`;
  const devices = data.maxDevices === null ? "Banyak perangkat" : `Maksimal ${data.maxDevices} perangkat`;
  return [
    ["Paket", data.planName],
    ["Masa aktif", period],
    ["Perangkat", devices],
    ["Nomor pesanan", data.orderId.slice(0, 8).toUpperCase()],
  ] as const;
}

export function buildAccessCodeEmail(data: AccessCodeEmailData): Omit<MailMessage, "to"> {
  const loginUrl = `${env.appUrl}/masuk`;
  const loginLabel = loginUrl.replace(/^https?:\/\//, "");
  const firstName = data.buyerName.trim().split(/\s+/)[0] || data.buyerName;
  const isReplacement = data.reason === "replacement";

  const subject = isReplacement
    ? `Kode akses baru SIAPAJAR Anda (paket ${data.planName})`
    : `Kode akses SIAPAJAR Anda sudah siap (paket ${data.planName})`;
  const headline = isReplacement ? "Ini kode akses baru Anda" : "Pembayaran berhasil!";
  const intro = isReplacement
    ? `Halo ${escapeHtml(firstName)}, kami membuatkan kode akses baru untuk paket <strong>${escapeHtml(data.planName)}</strong>. Kode lama sudah tidak berlaku.`
    : `Halo ${escapeHtml(firstName)}, terima kasih! Pembayaran paket <strong>${escapeHtml(data.planName)}</strong> sudah kami terima. Berikut kode akses Anda.`;
  const preheader = isReplacement
    ? "Kode akses baru Anda sudah siap. Kode lama tidak berlaku lagi."
    : `Kode akses SIAPAJAR Anda sudah siap. Masuk di ${loginLabel}.`;

  const steps = [
    ["Buka halaman masuk", `Kunjungi <a href="${loginUrl}" style="color:${C.brand};font-weight:600;text-decoration:underline;">${escapeHtml(loginLabel)}</a>.`],
    ["Masukkan kode akses", "Ketik atau tempel kode di atas. Huruf besar/kecil dan tanda hubung tidak berpengaruh."],
    ["Mulai menyusun soal", "Tentukan parameter, jalankan AI pilihan Anda, lalu sunting dan unduh naskahnya."],
  ];

  const detailRows = details(data)
    .map(
      ([label, value], i) => `
        <tr>
          <td style="padding:10px 0;${i > 0 ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:14px;color:${C.subtle};width:40%;vertical-align:top;">${label}</td>
          <td style="padding:10px 0;${i > 0 ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:14px;color:${C.ink};font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const stepRows = steps
    .map(
      ([title, body], i) => `
        <tr>
          <td style="padding:0 14px 16px 0;vertical-align:top;width:32px;">
            <div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${C.brand};color:#ffffff;text-align:center;font-family:${FONT};font-size:15px;font-weight:700;">${i + 1}</div>
          </td>
          <td style="padding:0 0 16px 0;vertical-align:top;font-family:${FONT};">
            <div style="font-size:15px;font-weight:700;color:${C.ink};line-height:22px;">${title}</div>
            <div style="font-size:14px;color:${C.muted};line-height:21px;margin-top:2px;">${body}</div>
          </td>
        </tr>`
    )
    .join("");

  const help = data.adminWhatsappUrl
    ? `Butuh bantuan? Balas email ini atau <a href="${data.adminWhatsappUrl}" style="color:${C.brand};font-weight:600;">chat admin lewat WhatsApp</a>.`
    : "Butuh bantuan? Balas email ini, tim kami siap membantu.";

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
<style>
  /* Clients that support media queries get tighter spacing on phones; others still fit thanks to table-layout:fixed. */
  @media only screen and (max-width: 480px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 22px !important; line-height: 30px !important; }
    .code { font-size: 20px !important; line-height: 30px !important; letter-spacing: 1px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.canvas};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas};">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- Brand -->
        <tr>
          <td style="padding:0 4px 16px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;"><img src="cid:siapajar-logo" width="36" height="36" alt="" style="display:block;border:0;width:36px;height:36px;"></td>
                <td style="vertical-align:middle;font-family:${FONT};font-size:20px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;">SIAPAJAR<span style="font-weight:500;color:${C.subtle};">.id</span></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${C.brand};line-height:0;font-size:0;border-radius:16px 16px 0 0;">
                  <img src="cid:siapajar-hero" width="600" alt="Kode akses SIAPAJAR" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:16px 16px 0 0;">
                </td>
              </tr>

              <tr>
                <td class="px" style="padding:32px 32px 8px 32px;font-family:${FONT};">
                  <h1 class="h1" style="margin:0;font-size:26px;line-height:34px;font-weight:800;color:${C.ink};letter-spacing:-0.4px;">${headline}</h1>
                  <p style="margin:12px 0 0 0;font-size:16px;line-height:25px;color:${C.muted};">${intro}</p>
                </td>
              </tr>

              <!-- Access code -->
              <tr>
                <td class="px" style="padding:20px 32px 8px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;background:${C.brandSoft};border:2px dashed ${C.brandLine};border-radius:14px;">
                    <tr>
                      <td align="center" style="padding:22px 16px 8px 16px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;color:${C.brand};text-transform:uppercase;">Kode akses Anda</td>
                    </tr>
                    <tr>
                      <td align="center" class="code" style="padding:4px 10px 6px 10px;font-family:${MONO};font-size:26px;line-height:36px;font-weight:700;letter-spacing:2px;color:${C.brandDark};word-break:break-all;">${escapeHtml(data.code)}</td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:0 16px 22px 16px;font-family:${FONT};font-size:13px;color:${C.subtle};">Salin kode ini persis seperti tertulis.</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Button -->
              <tr>
                <td align="center" class="px" style="padding:20px 32px 8px 32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:10px;background:${C.brand};">
                        <a href="${loginUrl}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Masuk ke SIAPAJAR &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Details -->
              <tr>
                <td class="px" style="padding:24px 32px 4px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">
                    ${detailRows}
                  </table>
                </td>
              </tr>

              <!-- Steps -->
              <tr>
                <td class="px" style="padding:24px 32px 4px 32px;font-family:${FONT};">
                  <h2 style="margin:0 0 16px 0;font-size:17px;font-weight:800;color:${C.ink};">Cara mulai</h2>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${stepRows}
                  </table>
                </td>
              </tr>

              <!-- Warning -->
              <tr>
                <td class="px" style="padding:4px 32px 28px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.warnBg};border:1px solid ${C.warnLine};border-radius:12px;">
                    <tr>
                      <td style="padding:14px 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.warnInk};">
                        <strong>Jaga kerahasiaan kode ini.</strong> Kode hanya untuk Anda dan dapat dipakai di ${data.maxDevices === null ? "beberapa" : `maksimal ${data.maxDevices}`} perangkat. Jika lebih, perangkat yang paling lama tidak dipakai akan keluar otomatis.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding:20px 32px 28px 32px;border-top:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">${help}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:20px 16px 8px 16px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.subtle};">
            Email ini dikirim karena ada pembelian paket SIAPAJAR dengan alamat email ini.<br>
            &copy; ${new Date().getFullYear()} SIAPAJAR.id &middot; Asisten penyusunan naskah soal untuk guru Indonesia
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    headline,
    "",
    isReplacement
      ? `Halo ${firstName}, ini kode akses baru untuk paket ${data.planName}. Kode lama sudah tidak berlaku.`
      : `Halo ${firstName}, pembayaran paket ${data.planName} sudah kami terima.`,
    "",
    "KODE AKSES ANDA:",
    data.code,
    "",
    ...details(data).map(([label, value]) => `${label}: ${value}`),
    "",
    "Cara mulai:",
    `1. Buka ${loginUrl}`,
    "2. Masukkan kode akses di atas",
    "3. Mulai menyusun soal",
    "",
    "Jaga kerahasiaan kode ini. Mohon tidak membagikannya.",
    data.adminWhatsappUrl ? `Butuh bantuan? Balas email ini atau chat admin: ${data.adminWhatsappUrl}` : "Butuh bantuan? Balas email ini.",
  ].join("\n");

  return {
    subject,
    html,
    text,
    attachments: [
      { filename: "siapajar-logo.png", path: path.join(ASSETS, "logo.png"), cid: "siapajar-logo" },
      { filename: "siapajar-kode-akses.jpg", path: path.join(ASSETS, "hero.jpg"), cid: "siapajar-hero" },
    ],
  };
}
