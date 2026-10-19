import type { ButtonSpec } from "../levels/types";

interface Props {
  buttons: ButtonSpec[];
  onRun: (command: string) => void;
}

export function ButtonBar({ buttons, onRun }: Props) {
  return (
    <div className="gg-cmd-buttons" role="group" aria-label="Perintah yang tersedia">
      {buttons.map((b) => (
        <button key={b.command} type="button" className="gg-cmd-btn" onClick={() => onRun(b.command)}>
          {b.label}
        </button>
      ))}
    </div>
  );
}
