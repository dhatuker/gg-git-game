import { useLang } from "./LanguageProvider";
import type { Level } from "../levels/types";

interface Props {
  levels: Level[];
  current: number;
  completed: number[];
  unlocked: (index: number) => boolean;
  onGoto: (index: number) => void;
}

/** Sepuluh level sebagai satu jalur dengan sepuluh stasiun. */
export function LevelMap({ levels, current, completed, unlocked, onGoto }: Props) {
  const { t, tl } = useLang();
  return (
    <nav className="gg-map" aria-label={t("ui.mapLabel")}>
      <ol>
        {levels.map((l, i) => {
          const done = completed.includes(l.id);
          const open = unlocked(i);
          const cls = i === current ? "gg-stop-current" : done ? "gg-stop-done" : "";
          return (
            <li key={l.id} className={cls}>
              <button
                type="button"
                className="gg-stop"
                disabled={!open}
                aria-current={i === current ? "step" : undefined}
                aria-label={t(done ? "ui.mapStopDone" : open ? "ui.mapStop" : "ui.mapStopLocked", { n: l.id, title: tl(l.title) })}
                onClick={() => onGoto(i)}
              >
                {l.id}
              </button>
              <span className="gg-stop-name">{tl(l.title)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
