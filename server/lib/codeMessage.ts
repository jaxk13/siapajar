// WhatsApp message the admin sends to the buyer together with the access code.
// Shared by the admin panel and the CLI so both send the same text.

export function buildCodeMessage(data: {
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  /** Set when an already-active code is replaced: the original expiry still applies. */
  expiresAt?: Date | null;
}): string {
  const devices = data.maxDevices === null ? "banyak perangkat" : `maksimal ${data.maxDevices} perangkat`;
  const period = data.expiresAt
    ? `Masa aktif tetap berlaku hingga ${data.expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}.`
    : `Masa aktif ${data.durationDays} hari dihitung sejak kode pertama kali dipakai.`;

  return [
    "Terima kasih, pembayaran Anda sudah kami terima.",
    "",
    `Kode akses SIAPAJAR (paket ${data.planName}):`,
    data.code,
    "",
    "Cara masuk: buka siapajar.id/masuk lalu masukkan kode di atas.",
    period,
    `Kode dapat digunakan di ${devices}. Mohon tidak membagikan kode ini.`,
  ].join("\n");
}
