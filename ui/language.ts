import { LANG_COOKIE } from "../i18n/negotiate";
import type { Lang } from "../i18n/types";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Cookie preferensi bahasa; dibaca proxy saat pemain membuka `/`. */
export function langCookie(lang: Lang): string {
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}
