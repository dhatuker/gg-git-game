import { projectSetup } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

export const level12: Level = {
  id: 12,
  title: {
    id: "Merge fast-forward",
    en: "Fast-forward merge",
  },
  story: {
    id: "Branch `feature` sudah punya satu commit baru, sedangkan `main` belum bergerak. Saat di-merge, git cukup menggeser pointer `main` maju ke commit yang sama. Ini disebut fast-forward: tidak ada commit baru yang dibuat.",
    en: "The `feature` branch already has one new commit, while `main` has not moved. When you merge, git simply moves the `main` pointer forward to the same commit. This is called a fast-forward: no new commit is created.",
  },
  goal: {
    id: "Gabungkan `feature` ke `main` sehingga keduanya menunjuk commit yang sama.",
    en: "Merge `feature` into `main` so that both point at the same commit.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore", "branch", "switch", "checkout", "merge"],
  initialState: projectSetup([
    cmd("git switch -c feature"),
    write("search.js", "export function search(q) {}"),
    cmd("git add ."),
    cmd('git commit -m "Add search box"'),
    cmd("git switch main"),
  ]),
  hints: [
    {
      id: "Kamu sedang di `main`, dan `feature` sudah selangkah lebih maju. Merge selalu menarik perubahan ke branch yang sedang aktif (tempat HEAD berada).",
      en: "You are on `main`, and `feature` is one step ahead. A merge always pulls changes into the current branch (where HEAD is).",
    },
    {
      id: "Nama perintahnya adalah kata kerja \"gabungkan\" dalam bahasa Inggris.",
      en: "The command has the same name as the verb the level goal uses for joining the two branches.",
    },
    {
      id: "Perintah itu butuh satu argumen: nama branch yang perubahannya ingin kamu tarik ke `main`.",
      en: "That command needs one argument: the name of the branch whose changes you want to pull into `main`.",
    },
  ],
  isGoalReached: (s) => s.branches.main === s.branches.feature,
  solution: [cmd("git merge feature")],
};
