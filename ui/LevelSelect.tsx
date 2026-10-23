"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { LEVELS } from "../levels";
import { TIERS } from "../levels/tiers";
import { ctaFor } from "./HomePage";
import { firstOpenIndex } from "./game-state";
import { useLang } from "./LanguageProvider";
import { newCommands } from "./level-info";
import { SiteHeader } from "./SiteHeader";
import { useCompleted } from "./useCompleted";

export function LevelSelect() {
  const { t, tl, lang } = useLang();
  const completed = useCompleted();
  const openIndex = firstOpenIndex(completed);
  const allDone = LEVELS.every((l) => completed.includes(l.id));
  const cta = ctaFor(completed);
  const total = LEVELS.length;
  return (
    <div className="gg-page">
      <SiteHeader />
      <main>
        <div className="gg-lv-head">
          <div>
            <h1>{t("levels.title")}</h1>
            <p>{t("levels.intro")}</p>
          </div>
          <div className="gg-overall">
            <div className="gg-overall-row">
              <span>{t("levels.progress")}</span>
              <span>{t("levels.progressOf", { n: completed.length, total })}</span>
            </div>
            <div className="gg-bar" role="progressbar" aria-label={t("levels.progressBar")} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed.length}>
              <i style={{ width: `${(completed.length / total) * 100}%` }} />
            </div>
            <Link className="gg-btn gg-btn-primary gg-btn-sm" href={`/${lang}${cta.href}`}>
              {t(cta.key, { n: cta.n })}
            </Link>
          </div>
        </div>

        <div className="gg-lv-body">
          {TIERS.map((tier) => {
            const levels = LEVELS.filter((l) => l.id >= tier.from && l.id <= tier.to);
            const done = levels.filter((l) => completed.includes(l.id)).length;
            return (
              <section key={tier.id} className="gg-line-sec" style={{ "--c": `var(--lane-${tier.lane})` } as CSSProperties} aria-label={t("levels.tierLabel", { name: tl(tier.name) })}>
                <div className="gg-line-top">
                  <span className="gg-line-badge">{tl(tier.name)}</span>
                  <div className="gg-line-meta">
                    <div className="gg-line-what">{tl(tier.what)}</div>
                    <div className="gg-line-sub">
                      {tl(tier.sub)} {t("levels.range", { from: tier.from, to: tier.to })}
                    </div>
                  </div>
                  <span className="gg-line-prog">
                    {done}/{levels.length}
                  </span>
                </div>
                <ol className="gg-stops">
                  {levels.map((l) => {
                    const i = LEVELS.indexOf(l);
                    const isDone = completed.includes(l.id);
                    const isCur = !allDone && i === openIndex;
                    const locked = !isDone && !isCur;
                    const title = tl(l.title);
                    const cmds = newCommands(i);
                    const label = t(isDone ? "levels.stopDone" : isCur ? "levels.stopNext" : "levels.stopLocked", { n: l.id, title });
                    const act = isDone ? t("levels.actReplay") : isCur ? t("levels.actStart") : t("levels.actLocked", { n: l.id - 1 });
                    const row = (
                      <>
                        <span className="gg-stop-title">{title}</span>
                        {cmds.length > 0 && (
                          <span className="gg-chips" aria-label={t("levels.newCommands")}>
                            {cmds.map((c) => (
                              <span key={c} className="gg-cmd-chip">{c}</span>
                            ))}
                          </span>
                        )}
                        <span className="gg-stop-act">{act}</span>
                      </>
                    );
                    return (
                      <li key={l.id} className={`gg-lstop${isDone ? " gg-lstop-done" : ""}${isCur ? " gg-lstop-cur" : ""}${locked ? " gg-lstop-lock" : ""}`}>
                        <span className="gg-stop-node" aria-hidden="true">
                          {isDone ? (
                            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            l.id
                          )}
                        </span>
                        {locked ? (
                          <div className="gg-stop-row" role="link" aria-disabled="true" aria-label={label}>{row}</div>
                        ) : (
                          <Link className="gg-stop-row" href={`/${lang}/play/${l.id}`} aria-label={label}>{row}</Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
