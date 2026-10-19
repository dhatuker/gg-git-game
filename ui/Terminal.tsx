import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TerminalLine } from "./game-state";

interface Props {
  lines: TerminalLine[];
  onSubmit: (input: string) => void;
  inputEnabled: boolean;
}

export function Terminal({ lines, onSubmit, inputEnabled }: Props) {
  const [value, setValue] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <div className="gg-term">
      <div className="gg-term-log" ref={logRef} aria-live="polite">
        {lines.length === 0 && (
          <p className="gg-term-empty">
            {inputEnabled ? "Ketik perintah git di bawah, lalu tekan Enter." : "Output perintah akan muncul di sini."}
          </p>
        )}
        {lines.map((line, i) => (
          <div key={i} className={line.kind === "input" ? "gg-term-input-line" : line.kind === "error" ? "gg-term-error" : undefined}>
            {line.text}
          </div>
        ))}
      </div>
      {inputEnabled && (
        <form className="gg-term-form" onSubmit={submit}>
          <span aria-hidden="true">$</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="git status"
            aria-label="Perintah git"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </form>
      )}
    </div>
  );
}
