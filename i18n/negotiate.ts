import type { Lang } from "./types";

/** Cookie preferensi bahasa yang dibaca proxy dan ditulis tombol ID | EN. */
export const LANG_COOKIE = "gg-lang";

export function isLang(v: unknown): v is Lang {
  return v === "id" || v === "en";
}

/** Tag bahasa dari header Accept-Language, terurut menurut bobot q (menurun); q=0 dibuang. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, order) => {
      const [tag, ...attrs] = part.trim().split(";");
      const qAttr = attrs.map((a) => a.trim()).find((a) => a.startsWith("q="));
      const q = qAttr ? Number(qAttr.slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, order };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order)
    .map((x) => x.tag);
}

/** Cookie yang valid menang; selain itu bahasa yang didukung dengan bobot tertinggi; tanpa kecocokan → en. */
export function pickLang(cookie: string | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(cookie)) return cookie;
  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    const primary = tag.split("-")[0].toLowerCase();
    if (isLang(primary)) return primary;
  }
  return "en";
}
