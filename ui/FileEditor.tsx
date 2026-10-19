import { useState } from "react";
import type { Files } from "../engine/types";

interface Props {
  files: Files;
  conflicts: string[];
  onWrite: (file: string, content: string) => void;
  onResolve: (file: string, choice: "ours" | "theirs") => void;
}

function ContentEditor({ file, content, onSave }: { file: string; content: string; onSave: (c: string) => void }) {
  const [draft, setDraft] = useState(content);
  return (
    <>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Isi ${file}`} spellCheck={false} />
      <div className="gg-editor-row">
        <button type="button" className="gg-btn" disabled={draft === content} onClick={() => onSave(draft)}>
          Simpan perubahan
        </button>
      </div>
    </>
  );
}

export function FileEditor({ files, conflicts, onWrite, onResolve }: Props) {
  const names = Object.keys(files).sort();
  const [picked, setPicked] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const selected = picked && picked in files ? picked : (names[0] ?? null);

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    onWrite(name, "");
    setPicked(name);
    setNewName("");
  };

  return (
    <section className="gg-panel gg-editor" aria-label="Editor file">
      <h3>Editor file</h3>
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
            File ini konflik. Bagian di antara <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code> dan <code>=======</code> adalah versimu; di
            bawahnya versi branch yang di-merge.
          </p>
          <div className="gg-editor-row">
            <button type="button" className="gg-btn" onClick={() => onResolve(selected, "ours")}>
              Pakai versi saya
            </button>
            <button type="button" className="gg-btn" onClick={() => onResolve(selected, "theirs")}>
              Pakai versi mereka
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
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nama-file.txt" aria-label="Nama file baru" />
        <button type="submit" className="gg-btn" disabled={!newName.trim()}>
          Buat file
        </button>
      </form>
    </section>
  );
}
