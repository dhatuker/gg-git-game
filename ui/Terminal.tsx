import { useLang } from "./LanguageProvider";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TerminalLine } from "./game-state";

interface Props {
  lines: TerminalLine[];
  onSubmit: (input: string) => void;
}

export function Terminal({ lines, onSubmit }: Props) {
  const { t, line: fmt } = useLang();
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
      {/* aria-relevant="additions": saat bahasa diganti, teks baris lama berubah tapi tidak dibacakan ulang. */}
      <div className="gg-term-log" ref={logRef} aria-live="polite" aria-relevant="additions">
        {lines.length === 0 && (
          <p className="gg-term-empty">{t("ui.terminalEmpty")}</p>
        )}
        {lines.map((line, i) => (
          <div key={i} className={line.kind === "input" ? "gg-term-input-line" : line.kind === "error" ? "gg-term-error" : undefined}>
            {line.kind === "input" ? line.text : line.lines.map(fmt).join("\n")}
          </div>
        ))}
      </div>
      <form className="gg-term-form" onSubmit={submit}>
        <span aria-hidden="true">$</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="git …"
          aria-label={t("ui.terminalInput")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
