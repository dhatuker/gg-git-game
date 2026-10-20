"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LEVELS } from "../levels";
import { COMMAND_NOTES, SUMMARIES } from "../levels/summaries";
import { tierOf } from "../levels/tiers";
import type { GameState } from "./game-state";
import { GitGraph } from "./GitGraph";
import { computeGraphLayout } from "./layout";
import { useLang } from "./LanguageProvider";
import { countInputs, learnedCommands, newCommands, succeededInputs } from "./level-info";
import { RichText } from "./RichText";

interface Props {
  state: GameState;
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

/** Rangkuman level yang baru selesai: apa yang dipelajari, perintah yang dipakai, hasil graf, dan catatan perintah. */
export function SummaryDialog({ state, open, onClose, onRestart }: Props) {
  const { t, tl, lang } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"level" | "notes">("level");
  const level = LEVELS[state.levelIndex];
  const tier = tierOf(level.id);
  const next = LEVELS[state.levelIndex + 1];
  const layout = useMemo(() => computeGraphLayout(state.repo), [state.repo]);
  const used = useMemo(() => succeededInputs(state.lines), [state.lines]);
  const fresh = new Set(newCommands(state.levelIndex));
  const notes = learnedCommands(state.levelIndex);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const close = () => {
    setTab("level");
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="gg-sum"
      aria-labelledby="gg-sum-title"
      style={{ "--c": `var(--lane-${tier?.lane ?? 0})` } as React.CSSProperties}
      onClose={close}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="gg-sum-head">
        <div>
          <p className="gg-sum-done">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="9" cy="9" r="9" fill="var(--ok)" />
              <path d="M5 9.5l2.7 2.6L13 6.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("sum.done", { n: level.id })}
          </p>
          <h2 id="gg-sum-title">{tl(level.title)}</h2>
        </div>
        <button type="button" className="gg-x" aria-label={t("sum.close")} onClick={() => ref.current?.close()}>
          ×
        </button>
      </div>

      <div className="gg-tabs" role="tablist" aria-label={t("sum.tabs")}>
        {(["level", "notes"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`gg-tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`gg-pane-${k}`}
            tabIndex={tab === k ? 0 : -1}
            className="gg-tab"
            onClick={() => setTab(k)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const other = k === "level" ? "notes" : "level";
                setTab(other);
                document.getElementById(`gg-tab-${other}`)?.focus();
              }
            }}
          >
            {t(k === "level" ? "sum.tabLevel" : "sum.tabNotes")}
          </button>
        ))}
      </div>

      {tab === "level" ? (
        <div className="gg-sum-body" role="tabpanel" id="gg-pane-level" aria-labelledby="gg-tab-level">
          <section>
            <h3>{t("sum.learned")}</h3>
            <p className="gg-learned">
              <RichText text={tl(SUMMARIES[level.id])} />
            </p>
          </section>
          <section>
            <h3>{t("sum.used")}</h3>
            {used.length === 0 ? (
              <p className="gg-learned">{t("sum.usedNone")}</p>
            ) : (
              <ul className="gg-used">
                {used.map((c) => {
                  const name = c.trim().split(/\s+/)[1] ?? "";
                  const note = COMMAND_NOTES[name];
                  return (
                    <li key={c}>
                      <code>{c}</code>
                      {note && <span>{tl(note)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="gg-sum-result">
            <div>
              <h3>{t("sum.result")}</h3>
              <div className="gg-sum-graph">
                <GitGraph repo={state.repo} layout={layout} activeEvent={null} />
              </div>
            </div>
            <dl className="gg-stats">
              <dt>{t("sum.statCommands")}</dt>
              <dd>{countInputs(state.lines)}</dd>
              <dt>{t("sum.statErrors")}</dt>
              <dd>{state.failedAttempts}</dd>
              <dt>{t("sum.statHints")}</dt>
              <dd>{t("sum.statHintsValue", { n: state.hintsRevealed, total: level.hints.length })}</dd>
            </dl>
          </section>
        </div>
      ) : (
        <div className="gg-sum-body" role="tabpanel" id="gg-pane-notes" aria-labelledby="gg-tab-notes">
          <p className="gg-learned">{t("sum.notesIntro")}</p>
          <div className="gg-table-scroll">
            <table className="gg-ref">
              <thead>
                <tr>
                  <th scope="col">{t("sum.colCommand")}</th>
                  <th scope="col">{t("sum.colPurpose")}</th>
                  <th scope="col">{t("sum.colLevel")}</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((c) => (
                  <tr key={c.name} className={fresh.has(c.name) ? "gg-ref-new" : undefined}>
                    <td><code>git {c.name}</code></td>
                    <td>{COMMAND_NOTES[c.name] ? tl(COMMAND_NOTES[c.name]) : ""}</td>
                    <td className="gg-ref-lv">{c.levelId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="gg-sum-foot">
        <button
          type="button"
          className="gg-btn"
          onClick={() => {
            ref.current?.close();
            onRestart();
          }}
        >
          {t("ui.resetLevel")}
        </button>
        <Link className="gg-btn" href={`/${lang}/levels`} onClick={() => ref.current?.close()}>
          {t("sum.toMap")}
        </Link>
        {next && (
          <Link className="gg-btn gg-btn-primary" href={`/${lang}/play/${next.id}`} onClick={() => ref.current?.close()}>
            {t("sum.next", { n: next.id, title: tl(next.title) })}
          </Link>
        )}
      </div>
    </dialog>
  );
}
