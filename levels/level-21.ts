import type { RepoState } from "../engine/types";
import { remoteWorld } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

/** Pesan semua commit yang terjangkau dari ujung remote. */
function remoteMessages(s: RepoState): string[] {
  const r = s.remote;
  if (!r) return [];
  const seen = new Set<string>();
  const stack = r.branches.main !== undefined ? [r.branches.main] : [];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id) || !r.commits[id]) continue;
    seen.add(id);
    stack.push(...r.commits[id].parents);
  }
  return [...seen].map((id) => r.commits[id].message);
}

export const level21: Level = {
  id: 21,
  title: {
    id: "Push ditolak",
    en: "Push rejected",
  },
  story: {
    id: "Kamu selesai menulis kotak pencarian dan langsung ingin mengirimnya. Tetapi sementara kamu bekerja, teman satu tim sudah lebih dulu mendorong perubahan ke server. Kalau kamu mencoba mengirim sekarang, server akan menolaknya. Penolakan itu bukan error aneh: itu cara Git melindungi pekerjaan temanmu.",
    en: "You finished the search box and want to send it right away. But while you were working, a teammate pushed changes to the server first. If you try to send now, the server will reject it. That rejection is not a weird error: it is how Git protects your teammate's work.",
  },
  goal: {
    id: "Kirim commit \"Add search box\" ke server tanpa menghilangkan commit \"Update docs\" milik teman, sehingga ujung remote sama dengan `main` lokal dan memuat search.js dan docs.md.",
    en: "Send your \"Add search box\" commit to the server without losing your teammate's \"Update docs\" commit, so the remote tip matches local `main` and contains both search.js and docs.md.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase", "clone", "push", "remote", "pull", "fetch"],
  initialState: remoteWorld({
    cloned: true,
    teammate: [write("docs.md", "Setup guide"), cmd("git add ."), cmd('git commit -m "Update docs"')],
    local: [write("search.js", "export function search() {}"), cmd("git add ."), cmd('git commit -m "Add search box"')],
  }),
  hints: [
    {
      id: "Coba kirim dulu dan baca pesan penolakannya dengan teliti. Server menolak karena ia punya sesuatu yang belum kamu punya.",
      en: "Try sending first and read the rejection message carefully. The server refuses because it has something you do not have yet.",
    },
    {
      id: "Ambil dan gabungkan pekerjaan teman lebih dulu, lalu lihat graf: `main` kini memuat kedua pekerjaan dan berada di depan `origin/main`.",
      en: "Bring in and combine your teammate's work first, then check the graph: `main` now holds both pieces of work and is ahead of `origin/main`.",
    },
    {
      id: "Setelah riwayatmu mencakup commit teman, kirim lagi. Menyusun ulang commit-mu di atas `origin/main` juga boleh, asal akhirnya terkirim.",
      en: "Once your history includes your teammate's commit, send again. Replaying your commit on top of `origin/main` also works, as long as it ends up sent.",
    },
  ],
  mustRun: ["push"],
  isGoalReached: (s) => {
    const r = s.remote;
    const tip = r?.branches.main;
    if (!r || !r.connected || tip === undefined || tip !== s.branches["main"]) return false;
    const msgs = remoteMessages(s);
    if (!msgs.includes("Add search box") || !msgs.includes("Update docs")) return false;
    const snap = r.commits[tip]?.snapshot ?? {};
    return snap["search.js"] !== undefined && snap["docs.md"] !== undefined;
  },
  solution: [cmd("git pull"), cmd("git push")],
};
