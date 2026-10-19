"use client";

import { useEffect, useMemo, useReducer } from "react";
import { LEVELS } from "../levels";
import { AreaPanel } from "./AreaPanel";
import { FileEditor } from "./FileEditor";
import { hintNudge, initGame, isUnlocked, reduce, visibleHints } from "./game-state";
import { GitGraph } from "./GitGraph";
import { computeGraphLayout } from "./layout";
import { LevelMap } from "./LevelMap";
import { LevelPanel } from "./LevelPanel";
import { RichText } from "./RichText";
import { loadCompleted, saveCompleted } from "./progress";
import { Terminal } from "./Terminal";
import { useEventQueue } from "./useEventQueue";

function Caption({ text }: { text: string }) {
  return (
    <p className="gg-caption" aria-live="polite">
      <RichText text={text} />
    </p>
  );
}

export default function Game() {
  const [state, dispatch] = useReducer(reduce, undefined, () => initGame([]));
  const level = LEVELS[state.levelIndex];
  const layout = useMemo(() => computeGraphLayout(state.repo), [state.repo]);
  const queue = useEventQueue(state.events);

  // Progres dibaca setelah mount agar HTML server dan client sama.
  useEffect(() => {
    dispatch({ type: "load-progress", completed: loadCompleted() });
  }, []);
  // Hanya simpan bila ada progres, supaya render pertama ([]) tidak menimpa data tersimpan.
  useEffect(() => {
    if (state.completed.length > 0) saveCompleted(state.completed);
  }, [state.completed]);

  const run = (input: string) => dispatch({ type: "run", input });
  const isLast = state.levelIndex === LEVELS.length - 1;

  return (
    <div className="gg-shell">
      <header className="gg-header">
        <h1>Belajar Git</h1>
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
        <section className="gg-panel gg-graph-panel" aria-label="Graf commit">
          <div className="gg-graph-head">
            <h3 className="gg-section-title">Graf commit</h3>
            {queue.playing && (
              <button type="button" className="gg-btn" onClick={queue.skip}>
                Lewati animasi
              </button>
            )}
          </div>
          <GitGraph repo={state.repo} layout={layout} activeEvent={queue.active} />
          <Caption text={state.caption} />
        </section>
        <section className="gg-panel" aria-label="Tiga area git">
          <AreaPanel repo={state.repo} activeEvent={queue.active} />
        </section>
      </div>
    </div>
  );
}
