import { cmd, setup, write } from "./solve";
import type { Level } from "./types";

export const level08: Level = {
  id: 8,
  title: "Merge fast-forward",
  story:
    "Branch `fitur` sudah punya satu commit baru, sedangkan `main` belum bergerak. Saat di-merge, git cukup menggeser pointer `main` maju ke commit yang sama. Ini disebut fast-forward: tidak ada commit baru yang dibuat.",
  goal: "Gabungkan `fitur` ke `main` sehingga keduanya menunjuk commit yang sama.",
  mode: "terminal",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge"],
  buttons: [],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Commit pertama"'),
    cmd("git switch -c fitur"),
    write("fitur.txt", "Fitur login"),
    cmd("git add ."),
    cmd('git commit -m "Tambah fitur login"'),
    cmd("git switch main"),
  ]),
  hints: ["Kamu sedang di `main`. Merge menarik commit dari branch lain ke branch aktif.", "Ketik `git merge fitur`."],
  isGoalReached: (s) => s.branches.main === s.branches.fitur,
  solution: [cmd("git merge fitur")],
};
