"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { LEVELS } from "../levels";
import { AreaPanel } from "./AreaPanel";
import { FileEditor } from "./FileEditor";
import { hintNudge, initGame, isUnlocked, reduce, visibleHints } from "./game-state";
import { GitGraph } from "./GitGraph";
import { computeGraphLayout } from "./layout";
import { LevelMap } from "./LevelMap";
import { LevelPanel } from "./LevelPanel";
import type { Lang, TMsg } from "../i18n/types";
import { saveCarry, takeCarry } from "./carry";
import { langCookie } from "./language";
import { LanguageProvider, useLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { RichText } from "./RichText";
import { loadCompleted, saveCompleted } from "./progress";
import { Terminal } from "./Terminal";
import { useEventQueue } from "./useEventQueue";

function Caption({ message }: { message: TMsg | null }) {
  const { line } = useLang();
  return (
    <p className="gg-caption" aria-live="polite">
      {message && <RichText text={line(message)} />}
    </p>
  );
}

export default function Game({ lang }: { lang: Lang }) {
  return (
    <LanguageProvider lang={lang}>
      <GameView />
    </LanguageProvider>
  );
}

function GameView() {
  const { t, lang } = useLang();
  const [state, dispatch] = useReducer(reduce, undefined, () => initGame([]));
  const level = LEVELS[state.levelIndex];
  const layout = useMemo(() => computeGraphLayout(state.repo), [state.repo]);
  const queue = useEventQueue(state.events);

  // Progres dibaca setelah mount agar HTML server dan client sama.
  // Saat pindah bahasa, state level dibawa lewat sessionStorage; selain itu muat progres tersimpan.
  // Penjaga ref: StrictMode di `next dev` menjalankan efek mount dua kali; tanpa ini, putaran kedua menimpa
  // state yang baru dipulihkan dengan load-progress.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const saved = loadCompleted();
    const carried = takeCarry(lang);
    if (carried) dispatch({ type: "restore", state: carried, savedCompleted: saved });
    else dispatch({ type: "load-progress", completed: saved });
  }, [lang]);
  // Hanya simpan bila ada progres, supaya render pertama ([]) tidak menimpa data tersimpan.
  useEffect(() => {
    if (state.completed.length > 0) saveCompleted(state.completed);
  }, [state.completed]);

  const run = (input: string) => dispatch({ type: "run", input });
  const isLast = state.levelIndex === LEVELS.length - 1;

  return (
    <div className="gg-shell">
      <header className="gg-header">
        <div className="gg-title-row">
          <h1>{t("ui.appTitle")}</h1>
          <LanguageToggle
            onSwitch={(next) => {
              saveCarry(state, next);
              document.cookie = langCookie(next);
              // Sengaja reload dokumen penuh: dengan cacheComponents, router.push menyimpan halaman bahasa lama
              // secara tersembunyi (React Activity), sehingga saat kembali ke bahasa itu state lamanya yang muncul.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign(`/${next}`);
            }}
          />
        </div>
        <LevelMap
          levels={LEVELS}
          current={state.levelIndex}
          completed={state.completed}
          unlocked={(i) => isUnlocked(state.completed, i)}
          onGoto={(index) => dispatch({ type: "goto-level", index })}
        />
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
          onNext={() => dispatch({ type: "goto-level", index: state.levelIndex + 1 })}
        />
        <Terminal key={state.levelIndex} lines={state.lines} onSubmit={run} />
        {level.editor && (
          <FileEditor
            files={state.repo.files}
            conflicts={state.repo.mergeState?.conflicts ?? []}
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
          <AreaPanel repo={state.repo} activeEvent={queue.active} />
        </section>
      </div>
    </div>
  );
}
