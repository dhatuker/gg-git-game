import { useLang } from "./LanguageProvider";
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { RawStyle } from "../engine/messages";
import type { TLine } from "../i18n/types";
import { COMMAND_FLAGS } from "../engine";
import { COMMAND_NOTES } from "../levels/summaries";
import type { TerminalLine } from "./game-state";
import { RichText } from "./RichText";

interface Props {
  /** Baris yang terlihat (setelah `clear`). */
  lines: TerminalLine[];
  /** Input sebelumnya untuk ↑/↓, dari yang paling lama. */
  history: string[];
  onSubmit: (input: string) => void;
}

const STYLE_CLASS: Record<RawStyle, string> = { add: "gg-term-add", del: "gg-term-del", meta: "gg-term-meta" };

/** Baris output dipisah "\n" (log memakai white-space: pre-wrap); baris raw bergaya (diff) diberi warna. */
function OutputText({ lines, format }: { lines: TLine[]; format: (l: TLine) => string }) {
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && "\n"}
          {"raw" in l && l.style ? <span className={STYLE_CLASS[l.style]}>{format(l)}</span> : format(l)}
        </Fragment>
      ))}
    </>
  );
}

/** Output `git help`: daftar perintah, kegunaan, dan opsi yang ada di game ini. */
function HelpBlock({ line }: { line: Extract<TerminalLine, { kind: "help" }> }) {
  const { t, tl } = useLang();
  return (
    <div className="gg-term-help">
      {line.unknown && (
        <p className="gg-term-error">
          <RichText text={t("term.helpUnknown", { cmd: line.unknown })} />
        </p>
      )}
      {!line.topic && <p>{t("term.helpTitle")}</p>}
      <dl>
        {line.commands.map((name) => {
          const flags = COMMAND_FLAGS[name]?.flags ?? [];
          const note = COMMAND_NOTES[name];
          return (
            <div key={name}>
              <dt>git {name}</dt>
              <dd>
                {note && tl(note)}
                {flags.length > 0 && <span className="gg-term-muted"> {t("term.helpOptions", { options: flags.join(", ") })}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="gg-term-muted">
        <RichText text={t("term.helpFooter")} />
      </p>
    </div>
  );
}

/** Kursor diletakkan di input hanya di perangkat dengan mouse; di HP fokus otomatis memunculkan keyboard dan menutupi layar. */
function canAutoFocus(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches === true;
}

export function Terminal({ lines, history, onSubmit }: Props) {
  const { t, line: fmt } = useLang();
  const [value, setValue] = useState("");
  // Posisi di riwayat saat menekan ↑/↓; null = sedang mengetik baris baru (disimpan di `draft`).
  const [pos, setPos] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (canAutoFocus()) inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
    setPos(null);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      onSubmit("clear");
      return;
    }
    if (e.key === "ArrowUp") {
      if (history.length === 0) return;
      e.preventDefault();
      const next = pos === null ? history.length - 1 : Math.max(0, pos - 1);
      if (pos === null) setDraft(value);
      setPos(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      if (pos === null) return;
      e.preventDefault();
      if (pos < history.length - 1) {
        setPos(pos + 1);
        setValue(history[pos + 1]);
      } else {
        setPos(null);
        setValue(draft);
      }
    }
  };

  // Klik di mana saja di terminal memindahkan kursor ke input, kecuali saat pemain sedang memilih teks untuk disalin.
  const focusInput = () => {
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="gg-term" onClick={focusInput}>
      {/* aria-relevant="additions": saat bahasa diganti, teks baris lama berubah tapi tidak dibacakan ulang. */}
      <div className="gg-term-log" ref={logRef} aria-live="polite" aria-relevant="additions">
        {lines.length === 0 && (
          <p className="gg-term-empty">
            <RichText text={t("ui.terminalEmpty")} />
          </p>
        )}
        {lines.map((line, i) =>
          line.kind === "help" ? (
            <div key={i}>
              <div className="gg-term-input-line">{line.text}</div>
              <HelpBlock line={line} />
            </div>
          ) : (
            <div key={i} className={line.kind === "input" ? "gg-term-input-line" : line.kind === "error" ? "gg-term-error" : undefined}>
              {line.kind === "input" ? line.text : <OutputText lines={line.lines} format={fmt} />}
            </div>
          ),
        )}
      </div>
      <form className="gg-term-form" onSubmit={submit}>
        <span aria-hidden="true">$</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setPos(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="git …"
          aria-label={t("ui.terminalInput")}
          aria-describedby="gg-term-keys"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
        />
        <span id="gg-term-keys" className="gg-sr-only">
          {t("term.keys")}
        </span>
      </form>
    </div>
  );
}
