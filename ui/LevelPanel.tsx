import type { Level } from "../levels/types";
import { RichText } from "./RichText";

interface Props {
  level: Level;
  hints: string[];
  complete: boolean;
  isLast: boolean;
  onReset: () => void;
  onNext: () => void;
}

export function LevelPanel({ level, hints, complete, isLast, onReset, onNext }: Props) {
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
          {hints.map((h) => (
            <li key={h}>
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
      <div className="gg-level-actions">
        <button type="button" className="gg-btn" onClick={onReset}>
          Ulangi level
        </button>
      </div>
    </section>
  );
}
