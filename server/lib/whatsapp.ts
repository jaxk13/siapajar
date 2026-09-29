/**
 * Normalizes an Indonesian WhatsApp number to international digits (e.g. "0812-3456-7890" -> "6281234567890").
 * Returns null when the input does not look like a valid number.
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!/^62\d{8,13}$/.test(digits)) return null;
  return digits;
}

export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
