import { getHeadCommitId } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, idByMessage, write } from "./solve";
import type { Level } from "./types";

const LOGIN_FIXED = "export function login(user) {\n  if (!user) return null;\n}";

const initialState = projectSetup([
  cmd("git switch -c experiment"),
  write("style.css", "body { font-family: sans-serif; }\nnav { display: grid; }"),
  cmd("git add ."),
  cmd('git commit -m "Experiment: new layout"'),
  write("login.js", LOGIN_FIXED),
  cmd("git add ."),
  cmd('git commit -m "Fix null check in login"'),
  write("style.css", "body { font-family: sans-serif; }\nnav { display: grid; }\nbody { background: #111; }"),
  cmd("git add ."),
  cmd('git commit -m "Experiment: dark mode"'),
  cmd("git switch main"),
]);

export const level15: Level = {
  id: 15,
  title: {
    id: "Ambil satu commit",
    en: "Pick one commit",
  },
  story: {
    id: "Branch `experiment` penuh percobaan tampilan yang belum layak, tetapi di tengahnya ada satu perbaikan penting: \"Fix null check in login\". Kamu hanya butuh perbaikan itu di `main`. Menggabungkan seluruh branch akan ikut membawa percobaan. `cherry-pick` menyalin satu commit saja ke branch tempat kamu berada.",
    en: "The `experiment` branch is full of unfinished visual experiments, but in the middle there is one important fix: \"Fix null check in login\". You only need that fix on `main`. Merging the whole branch would bring the experiments along. `cherry-pick` copies just one commit onto the branch you are on.",
  },
  goal: {
    id: "Bawa hanya commit \"Fix null check in login\" ke `main`, tanpa perubahan style.css dari experiment.",
    en: "Bring only the \"Fix null check in login\" commit to `main`, without the style.css changes from the experiment.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick"],
  initialState,
  hints: [
    {
      id: "Kamu sedang di `main`. Menggabungkan `experiment` terlalu banyak membawa; cari perintah yang menyalin satu commit saja.",
      en: "You are on `main`. Merging `experiment` brings too much; look for the command that copies a single commit.",
    },
    {
      id: "Gunakan log pada branch `experiment` untuk menemukan id commit perbaikan login, lalu ingat id-nya.",
      en: "Use log on the `experiment` branch to find the id of the login fix commit, then remember that id.",
    },
    {
      id: "Bentuknya: nama perintah penyalin, lalu id commit perbaikan login. Pastikan HEAD ada di `main` saat menjalankannya.",
      en: "The shape: the copying command's name, then the id of the login fix commit. Make sure HEAD is on `main` when you run it.",
    },
  ],
  isGoalReached: (s) => {
    const head = getHeadCommitId(s);
    const exp = s.branches["experiment"];
    const refactor = Object.values(s.commits).find((c) => c.message === "Refactor app init");
    const source = Object.values(s.commits).find((c) => c.message === "Fix null check in login");
    return (
      s.head.type === "branch" &&
      s.head.name === "main" &&
      head !== null &&
      s.commits[head].message === "Fix null check in login" &&
      s.files["login.js"] === LOGIN_FIXED &&
      refactor !== undefined &&
      s.files["style.css"] === refactor.snapshot["style.css"] &&
      exp !== undefined &&
      s.commits[exp].message === "Experiment: dark mode" &&
      source !== undefined &&
      head !== source.id
    );
  },
  solution: [cmd(`git cherry-pick ${idByMessage(initialState, "Fix null check in login")}`)],
};
