import { LEVELS } from "../levels";
import { tierOf } from "../levels/tiers";
import type { Level, Localized } from "../levels/types";
import { useLang } from "./LanguageProvider";
import { RichText } from "./RichText";

interface Props {
  level: Level;
  hints: Localized[];
  hintsTotal: number;
  /** Sorot tombol petunjuk karena pemain beberapa kali gagal. */
  nudge: boolean;
  onRevealHint: () => void;
  complete: boolean;
  isLast: boolean;
  onReset: () => void;
  onNext: () => void;
  onOpenSummary: () => void;
}

export function LevelPanel({ level, hints, hintsTotal, nudge, onRevealHint, complete, isLast, onReset, onNext, onOpenSummary }: Props) {
  const { t, tl } = useLang();
  const tier = tierOf(level.id);
  const allShown = hints.length >= hintsTotal;
  return (
    <section className="gg-panel gg-level" aria-labelledby="gg-level-title">
      <p className="gg-level-num">
        {tier && (
          <span className="gg-tag" style={{ "--c": `var(--lane-${tier.lane})` } as React.CSSProperties}>
            {tl(tier.name)}
          </span>
        )}
        {t("ui.levelOf", { n: level.id, total: LEVELS.length })}
      </p>
      <h2 id="gg-level-title">{tl(level.title)}</h2>
      <p className="gg-story">
        <RichText text={tl(level.story)} />
      </p>
      <p className="gg-goal">
        <RichText text={tl(level.goal)} />
      </p>
      {hints.length > 0 && (
        <ol className="gg-hints" aria-label={t("ui.hints")}>
          {hints.map((h, i) => (
            <li key={i}>
              <span className="gg-hint-num">{t("ui.hintN", { n: i + 1 })}</span>
              <RichText text={tl(h)} />
            </li>
          ))}
        </ol>
      )}
      {complete ? (
        <div className="gg-complete" role="status">
          <span>{t(isLast ? "ui.allDone" : "ui.levelDone")}</span>
          <span className="gg-complete-actions">
            <button type="button" className="gg-btn" onClick={onOpenSummary}>
              {t("ui.viewSummary")}
            </button>
            {!isLast && (
              <button type="button" className="gg-btn gg-btn-primary" onClick={onNext}>
                {t("ui.nextLevel", { n: level.id + 1 })}
              </button>
            )}
          </span>
        </div>
      ) : null}
      {nudge && !complete && (
        <p className="gg-nudge-note" role="status">
          {t("ui.nudge")}
        </p>
      )}
      <div className="gg-level-actions">
        <button
          type="button"
          className={`gg-btn gg-btn-hint${nudge && !complete ? " gg-btn-nudge" : ""}`}
          onClick={onRevealHint}
          disabled={allShown}
        >
          {allShown ? t("ui.hintsAllShown") : t("ui.hintButton", { shown: hints.length, total: hintsTotal })}
        </button>
        <button type="button" className="gg-btn" onClick={onReset}>
          {t("ui.resetLevel")}
        </button>
      </div>
    </section>
  );
}
