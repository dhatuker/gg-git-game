import { projectSetup } from "./history";
import { cmd } from "./solve";
import type { Level } from "./types";

export const level11: Level = {
  id: 11,
  title: {
    id: "Pindah branch",
    en: "Switch branches",
  },
  story: {
    id: "HEAD menandai posisimu sekarang: biasanya HEAD menunjuk ke sebuah branch. `git switch` (atau `git checkout`) memindahkan HEAD ke branch lain dan menyesuaikan isi working directory.",
    en: "HEAD marks where you are right now: usually HEAD points at a branch. `git switch` (or `git checkout`) moves HEAD to another branch and updates the working directory to match.",
  },
  goal: {
    id: "Pindahkan HEAD ke branch `feature`.",
    en: "Move HEAD to the `feature` branch.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore", "branch", "switch", "checkout"],
  initialState: projectSetup([cmd("git branch feature")]),
  hints: [
    {
      id: "Perhatikan label HEAD di graf. Sekarang ia menempel ke `main`, padahal tujuannya ke branch lain.",
      en: "Look at the HEAD label on the graph. It is attached to `main` now, but it needs to be on another branch.",
    },
    {
      id: "Ada dua perintah yang bisa memindahkan HEAD. Keduanya disebut di cerita level di atas.",
      en: "Two commands can move HEAD. Both are named in the level story above.",
    },
    {
      id: "Perintah pindah branch butuh satu argumen: nama branch tujuan. Lihat tujuan level untuk namanya.",
      en: "The command that moves HEAD needs one argument: the name of the target branch. Check the level goal for the name.",
    },
  ],
  isGoalReached: (s) => s.head.type === "branch" && s.head.name === "feature",
  solution: [cmd("git switch feature")],
};
