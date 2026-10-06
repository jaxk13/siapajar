// Remembers where a visitor came from (utm_* and Meta's fbclid) so the order shows its ad source
// in the admin panel (ADR-017). Kept on this device for 7 days, matching Meta's click window.

const KEY = "siapajar_attribution";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PARAMS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  fbclid: "fbclid",
} as const;

type StoredKey = (typeof PARAMS)[keyof typeof PARAMS];

export type Attribution = Partial<Record<StoredKey | "fbp" | "fbc", string>>;

/** Call on public landing pages. A new ad click replaces the previous one. */
export function captureAttribution() {
  const query = new URLSearchParams(window.location.search);
  const found: Partial<Record<StoredKey, string>> = {};
  for (const [param, key] of Object.entries(PARAMS)) {
    const value = query.get(param)?.trim();
    if (value) found[key] = value.slice(0, 500);
  }
  if (Object.keys(found).length === 0) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...found, savedAt: Date.now() }));
  } catch {
    // Storage unavailable (private mode): the order simply has no ad source.
  }
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

/** Ad source plus Meta's browser ids (_fbp, _fbc cookies set by the Pixel). */
export function getAttribution(): Attribution {
  let stored: Attribution = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Attribution & { savedAt?: number };
      if (parsed.savedAt && Date.now() - parsed.savedAt < TTL_MS) {
        const { savedAt: _savedAt, ...rest } = parsed;
        stored = rest;
      } else {
        localStorage.removeItem(KEY);
      }
    }
  } catch {
    // ignore
  }
  const fbp = readCookie("_fbp");
  const fbc = readCookie("_fbc");
  return { ...stored, ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}
