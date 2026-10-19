import { cmd, headParents, setup, write } from "./solve";
import type { Level } from "./types";

export const level09: Level = {
  id: 9,
  title: {
    id: "Merge commit",
    en: "Merge commit",
  },
  story: {
    id: "Kali ini `main` dan `feature` sama-sama punya commit baru, jadi riwayatnya bercabang. Pointer tidak bisa sekadar digeser. Git membuat merge commit: commit khusus dengan dua parent yang menyatukan kedua cabang.",
    en: "This time `main` and `feature` both have new commits, so the history has split. The pointer cannot just move forward. Git creates a merge commit: a special commit with two parents that joins both branches.",
  },
  goal: {
    id: "Gabungkan `feature` ke `main` dengan merge commit.",
    en: "Merge `feature` into `main` with a merge commit.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge"],
  initialState: setup({ "README.md": "# My First Project" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "First commit"'),
    cmd("git switch -c feature"),
    write("login.txt", "Login page"),
    cmd("git add ."),
    cmd('git commit -m "Add login page"'),
    cmd("git switch main"),
    write("contact.txt", "email: hello@example.com"),
    cmd("git add ."),
    cmd('git commit -m "Add contact"'),
  ]),
  hints: [
    {
      id: "Lihat graf: `main` dan `feature` sama-sama punya commit yang tidak dimiliki pihak lain, jadi pointer tidak bisa sekadar digeser maju.",
      en: "Look at the graph: `main` and `feature` each have a commit the other lacks, so the pointer cannot simply move forward.",
    },
    {
      id: "Pastikan HEAD menempel ke `main`, karena hasil merge masuk ke branch aktif.",
      en: "Make sure HEAD is on `main`, because the merge result goes into the current branch.",
    },
    {
      id: "Perintahnya sama dengan level sebelumnya. Bedanya ada di hasil: perhatikan commit baru dengan dua garis parent.",
      en: "The command is the same as in the previous level. The difference is the result: watch for a new commit with two parent lines.",
    },
  ],
  isGoalReached: (s) => headParents(s) === 2,
  solution: [cmd("git merge feature")],
};
