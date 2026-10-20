"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { LEVELS } from "../levels";
import { tierOf } from "../levels/tiers";
import { AreaPanel } from "./AreaPanel";
import { FileEditor } from "./FileEditor";
import { firstOpenIndex, hintNudge, isUnlocked, reduce, startAt, visibleHints } from "./game-state";
import { GitGraph } from "./GitGraph";
import { computeGraphLayout } from "./layout";
import { LevelPanel } from "./LevelPanel";
import type { Lang, TMsg } from "../i18n/types";
import { saveCarry, takeCarry } from "./carry";
import { langCookie } from "./language";
import { LanguageProvider, useLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { RichText } from "./RichText";
import { loadCompleted, saveCompleted } from "./progress";
import { SummaryDialog } from "./SummaryDialog";
import { Terminal } from "./Terminal";
import { useEventQueue } from "./useEventQueue";
import { useReducedMotion } from "./useReducedMotion";
import { activeConflicts } from "../engine/state";

function Caption({ message }: { message: TMsg | null }) {
  const { line } = useLang();
  return (
    <p className="gg-caption" aria-live="polite">
      {message && <RichText text={line(message)} />}
    </p>
  );
}

/** Halaman belajar untuk satu level (rute /[lang]/play/[level]). `levelIndex` datang dari URL. */
export default function Game({ lang, levelIndex }: { lang: Lang; levelIndex: number }) {
  return (
    <LanguageProvider lang={lang}>
      <GameView levelIndex={levelIndex} />
    </LanguageProvider>
  );
}

function GameView({ levelIndex }: { levelIndex: number }) {
  const { t, tl, lang } = useLang();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(reduce, levelIndex, (i) => startAt(i));
  const [summaryOpen, setSummaryOpen] = useState(false);
  const level = LEVELS[state.levelIndex];
  const tier = tierOf(level.id);
  const layout = useMemo(() => computeGraphLayout(state.repo), [state.repo]);
  const queue = useEventQueue(state.events);

  // Progres dibaca setelah mount agar HTML server dan client sama.
  // Saat pindah bahasa, state level dibawa lewat sessionStorage; selain itu masuk ke level dari URL.
  // Level yang masih terkunci dialihkan ke level terbuka pertama.
  // Penjaga ref: StrictMode di `next dev` menjalankan efek mount dua kali; tanpa ini, putaran kedua menimpa
  // state yang baru dipulihkan.
  const started = useRef(false);
  const restored = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const saved = loadCompleted();
    const carried = takeCarry(lang);
    if (carried && carried.levelIndex === levelIndex) {
      restored.current = true;
      dispatch({ type: "restore", state: carried, savedCompleted: saved });
      return;
    }
    if (!isUnlocked(saved, levelIndex)) {
      router.replace(`/${lang}/play/${LEVELS[firstOpenIndex(saved)].id}`);
      return;
    }
    dispatch({ type: "enter-level", completed: saved, index: levelIndex });
  }, [lang, levelIndex, router]);
  // Hanya simpan bila ada progres, supaya render pertama ([]) tidak menimpa data tersimpan.
  useEffect(() => {
    if (state.completed.length > 0) saveCompleted(state.completed);
  }, [state.completed]);

  // Rangkuman terbuka sendiri sesaat setelah level selesai, kecuali selesainya berasal dari pemulihan state (ganti bahasa).
  useEffect(() => {
    if (!state.levelComplete) return;
    if (restored.current) {
      restored.current = false;
      return;
    }
    const timer = setTimeout(() => setSummaryOpen(true), reduced ? 200 : 1100);
    return () => clearTimeout(timer);
  }, [state.levelComplete, reduced]);

  const run = (input: string) => dispatch({ type: "run", input });
  const isLast = state.levelIndex === LEVELS.length - 1;
  const doneInTier = tier ? state.completed.filter((id) => id >= tier.from && id <= tier.to).length : 0;
  const tierSize = tier ? tier.to - tier.from + 1 : 0;

  return (
    <div className="gg-shell">
      <header className="gg-learn-bar">
        <Link className="gg-btn gg-btn-sm" href={`/${lang}/levels`} aria-label={t("play.backLabel")}>
          {t("play.back")}
        </Link>
        <div className="gg-where">
          <b>{t("play.levelTitle", { n: level.id, title: tl(level.title) })}</b>
          {tier && <span>{t("play.where", { tier: tl(tier.name), n: level.id, total: LEVELS.length })}</span>}
        </div>
        {tier && (
          <div
            className="gg-segs"
            style={{ "--c": `var(--lane-${tier.lane})` } as React.CSSProperties}
            role="img"
            aria-label={t("play.segs", { tier: tl(tier.name), done: doneInTier, total: tierSize })}
          >
            {Array.from({ length: tierSize }, (_, i) => {
              const id = tier.from + i;
              const cls = state.completed.includes(id) ? "gg-seg-done" : id === level.id ? "gg-seg-cur" : "";
              return <i key={id} className={cls} />;
            })}
          </div>
        )}
        <span className="gg-bar-spacer" />
        <LanguageToggle
          onSwitch={(next) => {
            saveCarry(state, next);
            document.cookie = langCookie(next);
            // Sengaja reload dokumen penuh: dengan cacheComponents, router.push menyimpan halaman bahasa lama
            // secara tersembunyi (React Activity), sehingga saat kembali ke bahasa itu state lamanya yang muncul.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign(`/${next}/play/${level.id}`);
          }}
        />
        <button type="button" className="gg-btn gg-btn-sm" disabled={!state.levelComplete} onClick={() => setSummaryOpen(true)}>
          {t("play.summary")}
        </button>
      </header>

      <div className="gg-left">
        <LevelPanel
          level={level}
          hints={visibleHints(state)}
          hintsTotal={level.hints.length}
          nudge={hintNudge(state)}
          onRevealHint={() => dispatch({ type: "reveal-hint" })}
          complete={state.levelComplete}
          isLast={isLast}
          onReset={() => dispatch({ type: "reset-level" })}
          onNext={() => router.push(`/${lang}/play/${level.id + 1}`)}
          onOpenSummary={() => setSummaryOpen(true)}
        />
        <Terminal key={state.levelIndex} lines={state.lines} onSubmit={run} />
        {level.editor && (
          <FileEditor
            files={state.repo.files}
            conflicts={activeConflicts(state.repo)}
            rebasing={!!state.repo.rebaseState}
            onWrite={(file, content) => dispatch({ type: "write", file, content })}
            onResolve={(file, choice) => dispatch({ type: "resolve", file, choice })}
          />
        )}
      </div>

      <div className="gg-right">
        <section className="gg-panel gg-graph-panel" aria-label={t("ui.graphTitle")}>
          <div className="gg-graph-head">
            <h3 className="gg-section-title">{t("ui.graphTitle")}</h3>
            {queue.playing && (
              <button type="button" className="gg-btn" onClick={queue.skip}>
                {t("ui.skipAnimation")}
              </button>
            )}
          </div>
          <GitGraph repo={state.repo} layout={layout} activeEvent={queue.active} />
          <Caption message={state.caption} />
        </section>
        <section className="gg-panel" aria-label={t("ui.areasLabel")}>
          <AreaPanel repo={state.repo} activeEvent={queue.active} showStash={level.allowedCommands.includes("stash")}
            showRemote={level.allowedCommands.includes("push")}
          />
        </section>
      </div>
      <SummaryDialog
        state={state}
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        onRestart={() => dispatch({ type: "reset-level" })}
      />
    </div>
  );
}
