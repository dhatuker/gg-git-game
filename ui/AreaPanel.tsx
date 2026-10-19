import type { GitEvent, RepoState } from "../engine/types";
import { headSnapshot } from "../engine/state";
import { highlightTargets } from "./highlight";

type Chip = { file: string; note?: "baru" | "diubah" | "konflik" };

function columns(repo: RepoState): { working: Chip[]; staging: Chip[]; committed: Chip[] } {
  const head = headSnapshot(repo);
  const conflicts = repo.mergeState?.conflicts ?? [];
  const working: Chip[] = [];
  for (const file of Object.keys(repo.files).sort()) {
    if (conflicts.includes(file)) working.push({ file, note: "konflik" });
    else if (!(file in repo.index)) working.push({ file, note: "baru" });
    else if (repo.files[file] !== repo.index[file]) working.push({ file, note: "diubah" });
  }
  const staging: Chip[] = Object.keys(repo.index)
    .sort()
    .filter((f) => repo.index[f] !== head[f])
    .map((file) => ({ file, note: file in head ? "diubah" : "baru" }));
  const committed: Chip[] = Object.keys(head)
    .sort()
    .map((file) => ({ file }));
  return { working, staging, committed };
}

interface Props {
  repo: RepoState;
  activeEvent: GitEvent | null;
}

export function AreaPanel({ repo, activeEvent }: Props) {
  const { working, staging, committed } = columns(repo);
  const files = highlightTargets(activeEvent, repo.branches).files;
  // Sorot di kolom tempat file itu "tiba": staging untuk git add, working untuk konflik.
  const litColumn = activeEvent?.type === "file-di-stage" ? "staging" : activeEvent?.type === "konflik-terjadi" ? "working" : null;
  const col = (key: string, title: string, desc: string, chips: Chip[], empty: string) => (
    <section className={`gg-area gg-area-${key}`} aria-label={title}>
      <h3>{title}</h3>
      <p className="gg-area-desc">{desc}</p>
      <ul>
        {chips.length === 0 && <li className="gg-chip-empty">{empty}</li>}
        {chips.map((c) => (
          <li
            key={`${key}-${c.file}-${c.note ?? ""}`}
            className={`gg-chip${c.note ? ` gg-chip-${c.note}` : ""}${litColumn === key && files.includes(c.file) ? " gg-chip-lit" : ""}`}
          >
            <span className="gg-chip-name">{c.file}</span>
            {c.note && <span className="gg-chip-note">{c.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="gg-areas">
      {col("working", "Working directory", "File di folder kerjamu", working, "Tidak ada perubahan")}
      <span className="gg-area-step" aria-hidden="true">git add</span>
      {col("staging", "Staging area", "Siap masuk commit berikutnya", staging, "Kosong")}
      <span className="gg-area-step" aria-hidden="true">git commit</span>
      {col("repo", "Repository", "Isi commit yang ditunjuk HEAD", committed, "Belum ada commit")}
    </div>
  );
}
