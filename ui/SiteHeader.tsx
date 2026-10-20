"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { langCookie } from "./language";
import { useLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

/** Ganti bahasa di halaman statis: tulis cookie lalu muat ulang rute yang sama di bahasa lain. */
export function switchLanguagePath(next: string): void {
  document.cookie = langCookie(next as "id" | "en");
  const rest = window.location.pathname.replace(/^\/(id|en)(?=\/|$)/, "");
  // Sengaja reload dokumen penuh (lihat catatan di Game.tsx tentang cacheComponents).
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/${next}${rest}`);
}

export function SiteHeader() {
  const { t, lang } = useLang();
  const path = usePathname();
  const onLevels = path.startsWith(`/${lang}/levels`);
  const onHome = path === `/${lang}`;
  return (
    <header className="gg-site-head">
      <Link className="gg-brand" href={`/${lang}`} aria-label={t("site.brandLabel")}>
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
          <path d="M4 17h26" stroke="var(--lane-0)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="9" cy="17" r="5.5" fill="var(--panel)" stroke="var(--lane-0)" strokeWidth="4" />
          <circle cx="25" cy="17" r="5.5" fill="var(--lane-0)" />
        </svg>
        GG Git Game
      </Link>
      <div className="gg-head-right">
        <nav className="gg-site-nav" aria-label={t("site.navLabel")}>
          <Link href={`/${lang}`} aria-current={onHome ? "page" : undefined}>
            {t("site.home")}
          </Link>
          <Link href={`/${lang}/levels`} aria-current={onLevels ? "page" : undefined}>
            {t("site.levels")}
          </Link>
        </nav>
        <LanguageToggle onSwitch={switchLanguagePath} />
      </div>
    </header>
  );
}
