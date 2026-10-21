import { getHeadCommitId, isReachable, unreachableCommits } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

const UNIQUE = ["Add profile page", "Style profile page"];

export const level20: Level = {
  id: 20,
  title: {
    id: "Pindahkan dasar",
    en: "Move the base",
  },
  story: {
    id: "Kamu mengerjakan halaman profil di `feature`, tetapi `main` sudah maju dengan dua commit baru. Merge akan menambah commit penggabung. Dengan `rebase`, commit `feature` dilepas lalu diputar ulang di atas ujung `main` sehingga riwayat tetap lurus. Commit lamamu diganti salinan baru dengan id berbeda.",
    en: "You built the profile page on `feature`, but `main` has moved ahead with two new commits. A merge would add a merge commit. With `rebase`, the `feature` commits are lifted off and replayed on top of the tip of `main`, keeping history straight. Your old commits are replaced by new copies with different ids.",
  },
  goal: {
    id: "Buat `feature` berdiri tepat di atas `main` dengan rebase, tanpa commit merge. Dua commit profil tetap ada.",
    en: "Make `feature` sit right on top of `main` using a rebase, without a merge commit. The two profile commits must remain.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase"],
  initialState: projectSetup([
    cmd("git switch -c feature"),
  write("profile.js", "export function renderProfile() {}"),
  cmd("git add ."),
  cmd('git commit -m "Add profile page"'),
  write("profile.css", ".profile { padding: 8px; }"),
  cmd("git add ."),
  cmd('git commit -m "Style profile page"'),
  cmd("git switch main"),
  write("CONTRIBUTING.md", "Open a pull request for every change.\nRun the tests first."),
  cmd("git add ."),
  cmd('git commit -m "Update contributing guide"'),
  write("README.md", "# My First Project\nSee CONTRIBUTING.md before opening a pull request."),
  cmd("git add ."),
  cmd('git commit -m "Update readme"'),
  cmd("git switch feature"),
  ]),
  hints: [
    {
      id: "Kamu di `feature`, sedangkan `main` sudah maju. Menggabungkan akan membuat commit merge; cari perintah yang memindahkan dasar branch.",
      en: "You are on `feature` while `main` moved ahead. Merging creates a merge commit; look for the command that moves a branch base.",
    },
    {
      id: "Perintah itu butuh satu argumen: branch yang akan menjadi dasar baru.",
      en: "That command needs one argument: the branch that becomes the new base.",
    },
    {
      id: "Bentuknya: nama perintah pemindah dasar, lalu nama branch `main`. Jalankan saat HEAD ada di `feature`.",
      en: "The shape: the base-moving command name, then the branch name `main`. Run it while HEAD is on `feature`.",
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
    return true;
  },
  solution: [cmd("git rebase main")],
};
