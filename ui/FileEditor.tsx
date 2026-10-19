import { useLang } from "./LanguageProvider";
import { defaultFile } from "./file-select";
import { RichText } from "./RichText";
import { useState } from "react";
import type { Files } from "../engine/types";

interface Props {
  files: Files;
  conflicts: string[];
  onWrite: (file: string, content: string) => void;
  onResolve: (file: string, choice: "ours" | "theirs") => void;
}

function ContentEditor({ file, content, onSave }: { file: string; content: string; onSave: (c: string) => void }) {
  const { t } = useLang();
  const [draft, setDraft] = useState(content);
  return (
    <>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t("ui.fileContent", { file })} spellCheck={false} />
      <div className="gg-editor-row">
        <button type="button" className="gg-btn" disabled={draft === content} onClick={() => onSave(draft)}>
          {t("ui.saveChanges")}
        </button>
      </div>
    </>
  );
}

export function FileEditor({ files, conflicts, onWrite, onResolve }: Props) {
  const { t } = useLang();
  const names = Object.keys(files).sort();
  const [picked, setPicked] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const selected = picked && picked in files ? picked : defaultFile(names, conflicts);

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    onWrite(name, "");
    setPicked(name);
    setNewName("");
  };

  return (
    <section className="gg-panel gg-editor" aria-label={t("ui.editorTitle")}>
      <h3>{t("ui.editorTitle")}</h3>
      {names.length > 0 && (
        <div className="gg-file-tabs">
          {names.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === selected}
              className={`gg-file-tab${conflicts.includes(n) ? " gg-file-tab-conflict" : ""}`}
              onClick={() => setPicked(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {selected && conflicts.includes(selected) && (
        <div className="gg-conflict-note">
          <p>
            <RichText text={t("ui.editorConflict")} />
          </p>
          <div className="gg-editor-row">
            <button type="button" className="gg-btn" onClick={() => onResolve(selected, "ours")}>
              {t("ui.useOurs")}
            </button>
            <button type="button" className="gg-btn" onClick={() => onResolve(selected, "theirs")}>
              {t("ui.useTheirs")}
            </button>
          </div>
        </div>
      )}
      {selected && (
        <ContentEditor key={`${selected}\u0000${files[selected]}`} file={selected} content={files[selected]} onSave={(c) => onWrite(selected, c)} />
      )}
      <form
        className="gg-editor-row"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("ui.newFilePlaceholder")} aria-label={t("ui.newFileLabel")} />
        <button type="submit" className="gg-btn" disabled={!newName.trim()}>
          {t("ui.createFile")}
        </button>
      </form>
    </section>
  );
}
