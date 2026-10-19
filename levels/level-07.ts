import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level07: Level = {
  id: 7,
  title: "Pindah branch",
  story:
    "HEAD menandai posisimu sekarang: biasanya HEAD menunjuk ke sebuah branch. `git switch` (atau `git checkout`) memindahkan HEAD ke branch lain dan menyesuaikan isi working directory.",
  goal: "Pindahkan HEAD ke branch `fitur`.",
  mode: "terminal",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout"],
  buttons: [],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Commit pertama"'),
    cmd("git branch fitur"),
  ]),
  hints: ["Perhatikan label HEAD di graf. Ia harus menempel ke `fitur`.", "Ketik `git switch fitur`."],
  isGoalReached: (s) => s.head.type === "branch" && s.head.name === "fitur",
  solution: [cmd("git switch fitur")],
};
