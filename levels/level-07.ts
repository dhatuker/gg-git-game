import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level07: Level = {
  id: 7,
  title: "Pindah branch",
  story:
    "HEAD menandai posisimu sekarang: biasanya HEAD menunjuk ke sebuah branch. `git switch` (atau `git checkout`) memindahkan HEAD ke branch lain dan menyesuaikan isi working directory.",
  goal: "Pindahkan HEAD ke branch `fitur`.",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout"],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Commit pertama"'),
    cmd("git branch fitur"),
  ]),
  hints: [
    "Perhatikan label HEAD di graf. Sekarang ia menempel ke `main`, padahal tujuannya ke branch lain.",
    "Ada dua perintah yang bisa memindahkan HEAD. Keduanya disebut di cerita level di atas.",
    "Perintah pindah branch butuh satu argumen: nama branch tujuan. Lihat tujuan level untuk namanya.",
  ],
  isGoalReached: (s) => s.head.type === "branch" && s.head.name === "fitur",
  solution: [cmd("git switch fitur")],
};
