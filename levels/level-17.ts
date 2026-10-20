import { getHeadCommitId, isReachable, unreachableCommits } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

const UNIQUE = ["Add profile page", "Rename project title"];

export const level17: Level = {
  id: 17,
  title: {
    id: "Rebase berkonflik",
    en: "Rebase with a conflict",
  },
  story: {
    id: "Branch `feature` memuat dua commit, dan salah satunya mengganti judul di README.md. Sementara itu `main` juga mengubah baris judul yang sama. Saat commit `feature` diputar ulang di atas `main`, git berhenti karena konflik. Selesaikan konfliknya seperti pada merge, lalu lanjutkan rebase-nya.",
    en: "The `feature` branch holds two commits, and one of them changes the title in README.md. Meanwhile `main` changed the very same title line. When the `feature` commits are replayed on top of `main`, git stops on a conflict. Resolve it like in a merge, then continue the rebase.",
  },
  goal: {
    id: "Pindahkan commit `feature` ke atas `main` dengan rebase, selesaikan konflik di README.md, dan selesaikan rebase-nya. Riwayat harus tetap lurus.",
    en: "Move the `feature` commits on top of `main` with a rebase, resolve the conflict in README.md, and finish the rebase. History must stay linear.",
  },
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase"],
  initialState: projectSetup([
    cmd("git switch -c feature"),
  write("profile.js", "export function renderProfile() {}"),
  cmd("git add ."),
  cmd('git commit -m "Add profile page"'),
  write("README.md", "# Awesome Project"),
  cmd("git add ."),
  cmd('git commit -m "Rename project title"'),
  cmd("git switch main"),
  write("CONTRIBUTING.md", "Open a pull request for every change.\nRun the tests first."),
  cmd("git add ."),
  cmd('git commit -m "Update contributing guide"'),
  write("README.md", "# Taskboard Pro"),
  cmd("git add ."),
  cmd('git commit -m "Update readme"'),
  cmd("git switch feature"),
  ]),
  hints: [
    {
      id: "Commit di `feature` perlu diputar ulang di atas ujung branch lain agar riwayatnya lurus. Kalau dua sisi mengubah baris yang sama, git akan berhenti di tengah jalan dan menunggumu.",
      en: "The commits on `feature` need to be replayed on top of the tip of another branch so history stays straight. If both sides changed the same line, git will stop halfway and wait for you.",
    },
    {
      id: "Mulai dengan perintah pemindah dasar dan beri nama branch tujuan (`main`). Saat git berhenti, buka README.md di Editor file, pilih versi yang dipakai, lalu masukkan file itu ke staging.",
      en: "Start with the base-moving command and give it the target branch (`main`). When git stops, open README.md in the File editor, pick the version to keep, then put the file into staging.",
    },
    {
      id: "Beri tahu rebase untuk melanjutkan dengan opsi untuk meneruskan. Bila ragu, opsi untuk membatalkan mengembalikan semuanya.",
      en: "Tell the rebase to go on using its option for continuing. If you are unsure, the option for cancelling restores everything.",
    },
  ],
  mustRun: ["rebase"],
  isGoalReached: (s) => {
    const feature = s.branches["feature"];
    const main = s.branches["main"];
    if (feature === undefined || main === undefined) return false;
    if (s.head.type !== "branch" || s.head.name !== "feature" || s.rebaseState !== null) return false;
    if (!isReachable(s, feature, main)) return false;
    // Tepat dua commit unik di atas main, lurus (bukan merge), dan pesannya sesuai.
    const unique: string[] = [];
    let cur = feature;
    while (cur !== main) {
      const c = s.commits[cur];
      if (!c || c.parents.length !== 1) return false;
      unique.push(c.message);
      cur = c.parents[0];
    }
    if (unique.length !== UNIQUE.length || !UNIQUE.every((m) => unique.includes(m))) return false;
    if (getHeadCommitId(s) !== feature) return false;
    if (unreachableCommits(s).length < 2) return false;
    const readme = s.files["README.md"];
    if (readme === undefined || readme.includes("<<<<<<<")) return false;
    return true;
  },
  solution: [
    cmd("git rebase main"),
    { kind: "resolve", file: "README.md", choice: "theirs" },
    cmd("git add README.md"),
    cmd("git rebase --continue"),
  ],
};
