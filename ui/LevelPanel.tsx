import type { Level } from "../levels/types";
import { RichText } from "./RichText";

interface Props {
  level: Level;
  hints: string[];
  hintsTotal: number;
  /** Sorot tombol petunjuk karena pemain beberapa kali gagal. */
  nudge: boolean;
  onRevealHint: () => void;
  complete: boolean;
  isLast: boolean;
  onReset: () => void;
  onNext: () => void;
}

export function LevelPanel({ level, hints, hintsTotal, nudge, onRevealHint, complete, isLast, onReset, onNext }: Props) {
  const allShown = hints.length >= hintsTotal;
  return (
    <section className="gg-panel gg-level" aria-labelledby="gg-level-title">
      <p className="gg-level-num">Level {level.id} dari 10</p>
      <h2 id="gg-level-title">{level.title}</h2>
      <p className="gg-story">
        <RichText text={level.story} />
      </p>
      <p className="gg-goal">
        <RichText text={level.goal} />
      </p>
      {hints.length > 0 && (
        <ol className="gg-hints" aria-label="Petunjuk">
          {hints.map((h, i) => (
            <li key={h}>
              <span className="gg-hint-num">Petunjuk {i + 1}</span>
              <RichText text={h} />
            </li>
          ))}
        </ol>
      )}
      {complete ? (
        <div className="gg-complete" role="status">
          <span>{isLast ? "Semua level selesai. Kamu sudah bisa branch dan merge!" : "Level selesai!"}</span>
          {!isLast && (
            <button type="button" className="gg-btn gg-btn-primary" onClick={onNext}>
              Lanjut ke level {level.id + 1}
            </button>
          )}
        </div>
      ) : null}
      {nudge && !complete && (
        <p className="gg-nudge-note" role="status">
          Kesulitan? Petunjuk bisa membantu tanpa memberi jawabannya.
        </p>
      )}
      <div className="gg-level-actions">
        <button
          type="button"
          className={`gg-btn gg-btn-hint${nudge && !complete ? " gg-btn-nudge" : ""}`}
          onClick={onRevealHint}
          disabled={allShown}
        >
          {allShown ? "Semua petunjuk terbuka" : `Minta petunjuk (${hints.length}/${hintsTotal})`}
        </button>
        <button type="button" className="gg-btn" onClick={onReset}>
          Ulangi level
        </button>
      </div>
    </section>
  );
}
