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
  return (
    <nav className="gg-map" aria-label="Peta level">
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
                aria-label={`Level ${l.id}: ${l.title}${done ? " (selesai)" : open ? "" : " (terkunci)"}`}
                onClick={() => onGoto(i)}
              >
                {l.id}
              </button>
              <span className="gg-stop-name">{l.title}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
