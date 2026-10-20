"use client";

import Link from "next/link";
import { LEVELS } from "../levels";
import { TIERS } from "../levels/tiers";
import { firstOpenIndex } from "./game-state";
import { HeroDemo } from "./HeroDemo";
import { useLang } from "./LanguageProvider";
import { RichText } from "./RichText";
import { SiteHeader } from "./SiteHeader";
import { useCompleted } from "./useCompleted";

/** Tombol utama: mulai, lanjutkan di level pertama yang belum selesai, atau ulangi bila semuanya selesai. */
export function ctaFor(completed: number[]): { href: string; key: "home.ctaStart" | "home.ctaContinue" | "home.ctaAgain"; n: number } {
  const open = firstOpenIndex(completed);
  const all = LEVELS.every((l) => completed.includes(l.id));
  if (all) return { href: `/play/${LEVELS[0].id}`, key: "home.ctaAgain", n: LEVELS[0].id };
  const n = LEVELS[open].id;
  return { href: `/play/${n}`, key: completed.length === 0 ? "home.ctaStart" : "home.ctaContinue", n };
}

export function HomePage() {
  const { t, tl, lang } = useLang();
  const completed = useCompleted();
  const cta = ctaFor(completed);
  return (
    <div className="gg-page">
      <SiteHeader />
      <main>
        <section className="gg-hero">
          <div>
            <h1>{t("home.title")}</h1>
            <p className="gg-lede">{t("home.lede")}</p>
            <div className="gg-hero-cta">
              <Link className="gg-btn gg-btn-primary gg-btn-lg" href={`/${lang}${cta.href}`}>
                {t(cta.key, { n: cta.n })}
              </Link>
              <Link className="gg-btn gg-btn-lg" href={`/${lang}/levels`}>
                {t("home.ctaAll")}
              </Link>
            </div>
            <p className="gg-hero-note">
              <RichText text={t("home.note", { total: LEVELS.length })} />
            </p>
          </div>
          <HeroDemo />
        </section>

        <section className="gg-how" aria-label={t("home.how")}>
          {(["1", "2", "3"] as const).map((n) => (
            <div key={n}>
              <h3>{t(`home.how${n}Title` as "home.how1Title")}</h3>
              <p>{t(`home.how${n}Body` as "home.how1Body")}</p>
            </div>
          ))}
        </section>

        <section className="gg-strip-sec" aria-labelledby="gg-strip-title">
          <h2 id="gg-strip-title">{t("home.linesTitle")}</h2>
          <div className="gg-strip">
            {TIERS.map((tier) => {
              const count = tier.to - tier.from + 1;
              const done = completed.filter((id) => id >= tier.from && id <= tier.to).length;
              return (
                <Link key={tier.id} href={`/${lang}/levels`} style={{ "--c": `var(--lane-${tier.lane})` } as React.CSSProperties}>
                  <b>{tl(tier.name)}</b>
                  <span>
                    {tl(tier.what)}
                    <br />
                    {done > 0 ? t("home.levelCountDone", { c: count, d: done }) : t("home.levelCount", { c: count })}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
