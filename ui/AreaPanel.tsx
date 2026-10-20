import type React from "react";
import { useLang } from "./LanguageProvider";
import type { GitEvent, RepoState } from "../engine/types";
import { activeConflicts, connectedRemote, headSnapshot } from "../engine/state";
import { highlightTargets, litColumn as litColumnOf } from "./highlight";

/** `note` juga dipakai sebagai nama kelas CSS (gg-chip-baru, dst.), jadi nilainya tetap; labelnya diterjemahkan. */
type Chip = { file: string; note?: "baru" | "diubah" | "konflik" };

const NOTE_KEY = { baru: "ui.noteNew", diubah: "ui.noteChanged", konflik: "ui.noteConflict" } as const;

export function columns(repo: RepoState): { working: Chip[]; staging: Chip[]; committed: Chip[]; stash: Chip[]; remote: Chip[] } {
  const head = headSnapshot(repo);
  const conflicts = activeConflicts(repo);
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
  const stash: Chip[] = repo.stash.map((_, i) => ({ file: `stash@{${i}}` }));
  const remote: Chip[] = connectedRemote(repo) ? [{ file: "origin/main" }] : [];
  return { working, staging, committed, stash, remote };
}

/** Ringkasan lokal vs remote; `behind` dihitung terhadap ujung remote sebenarnya, bukan hanya `origin/main` lokal. */
export function remoteSummary(repo: RepoState): { ahead: number; behind: number; tip: { id: string; message: string } } | null {
  const remote = connectedRemote(repo);
  const local = repo.branches.main;
  const tipId = remote?.branches.main;
  if (!remote || !tipId) return null;
  const all = { ...repo.commits, ...remote.commits };
  if ((local && !all[local]) || !all[tipId]) return null;
  const reach = (from: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur) || !all[cur]) continue;
      seen.add(cur);
      stack.push(...all[cur].parents);
    }
    return seen;
  };
  const mine = local ? reach(local) : new Set<string>();
  const theirs = reach(tipId);
  return {
    ahead: [...mine].filter((id) => !theirs.has(id)).length,
    behind: [...theirs].filter((id) => !mine.has(id)).length,
    tip: { id: tipId, message: all[tipId].message },
  };
}

interface Props {
  repo: RepoState;
  activeEvent: GitEvent | null;
  showStash: boolean;
  showRemote: boolean;
}

export function AreaPanel({ repo, activeEvent, showStash, showRemote }: Props) {
  const { t } = useLang();
  const { working, staging, committed, stash, remote } = columns(repo);
  const summary = remoteSummary(repo);
  const files = highlightTargets(activeEvent, repo.branches).files;
  // Sorot kolom tempat perubahan "tiba" (lihat litColumnOf).
  const litColumn = litColumnOf(activeEvent);
  const col = (key: string, title: string, desc: string, chips: Chip[], empty: string, extra?: React.ReactNode) => (
    <section className={`gg-area gg-area-${key}${litColumn === key ? " gg-area-lit" : ""}`} aria-label={title}>
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
            {c.note && <span className="gg-chip-note">{t(NOTE_KEY[c.note])}</span>}
          </li>
        ))}
      </ul>
      {extra}
    </section>
  );
  return (
    <div className={`gg-areas${showStash ? " gg-areas-stash" : ""}${showRemote ? " gg-areas-remote" : ""}`}>
      {col("working", t("ui.areaWorking"), t("ui.areaWorkingDesc"), working, t("ui.areaWorkingEmpty"))}
      <span className="gg-area-step" aria-hidden="true">git add</span>
      {col("staging", t("ui.areaStaging"), t("ui.areaStagingDesc"), staging, t("ui.areaStagingEmpty"))}
      <span className="gg-area-step" aria-hidden="true">git commit</span>
      {col("repo", t("ui.areaRepo"), t("ui.areaRepoDesc"), committed, t("ui.areaRepoEmpty"))}
      {showStash && (
        <>
          <span className="gg-area-step gg-area-step-stash" aria-hidden="true">git stash / git stash pop</span>
          {col("stash", t("ui.areaStash"), t("ui.areaStashDesc"), stash, t("ui.areaStashEmpty"))}
        </>
      )}
      {showRemote && (
        <>
          <span className="gg-area-step gg-area-step-remote" aria-hidden="true">git push / git pull</span>
          {col("remote", t("ui.areaRemote"), t("ui.areaRemoteDesc"), remote, t("ui.areaRemoteEmpty"), summary && (
            <p className="gg-remote-summary">
              {summary.ahead === 0 && summary.behind === 0 && t("ui.remoteSynced")}
              {summary.ahead > 0 && <span>{t("ui.remoteAhead", { n: summary.ahead })}</span>}
              {summary.behind > 0 && <span>{t("ui.remoteBehind", { n: summary.behind })}</span>}
              <span className="gg-remote-tip">{summary.tip.id}: {summary.tip.message}</span>
            </p>
          ))}
        </>
      )}
    </div>
  );
}
