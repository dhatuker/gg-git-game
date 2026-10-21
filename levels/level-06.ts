import { getHeadCommitId, headSnapshot } from "../engine/state";
import { applySteps, cmd, setup, write } from "./solve";
import type { Level } from "./types";

const APP_OLD = "export function greet(name) {\n  return 'Hi ' + name;\n}";
const APP_NEW = `${APP_OLD}\n\nexport function bye(name) {\n  return 'Bye ' + name;\n}`;
const CONFIG_OLD = "export const debug = false;";

const BASE = setup({ "README.md": "# Greeter", "app.js": APP_OLD, "config.js": CONFIG_OLD }, [
  cmd("git init"),
  cmd("git add ."),
  cmd('git commit -m "Initial commit"'),
]);
const BASE_ID = getHeadCommitId(BASE);

export const level06: Level = {
  id: 6,
  title: { id: "Melihat perubahan", en: "Seeing changes" },
  story: {
    id: "Kamu mengubah dua file kemarin, tapi lupa persisnya apa saja. Sebelum commit, biasakan memeriksa dulu: `git diff` menampilkan baris yang berubah di working directory dan belum di-stage. Baris berawalan `-` dihapus, baris berawalan `+` ditambah.",
    en: "You changed two files yesterday but forgot exactly what. Before committing, make a habit of checking first: `git diff` shows the lines that changed in the working directory and are not staged yet. Lines starting with `-` were removed, lines starting with `+` were added.",
  },
  goal: {
    id: "Periksa perubahanmu, lalu commit hanya perubahan yang disengaja. Baris debug yang tak sengaja tidak boleh ikut.",
    en: "Check your changes, then commit only the intended change. The accidental debug line must not be included.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff"],
  initialState: applySteps(BASE, [write("app.js", APP_NEW), write("config.js", "export const debug = true;")]),
  hints: [
    {
      id: "Panel area hanya menunjukkan file mana yang berubah, bukan isinya. Kamu perlu melihat baris per baris sebelum memutuskan.",
      en: "The area panel only shows which files changed, not what is inside. You need to look line by line before you decide.",
    },
    {
      id: "Salah satu file hanya mengubah satu baris pengaturan debug. Stage file satu per satu, jangan semuanya sekaligus.",
      en: "One of the files only flips a debug setting. Stage files one at a time, not everything at once.",
    },
    {
      id: "Perintah untuk melihat baris yang berubah disebut di cerita. Setelah tahu file mana yang benar, stage hanya file itu lalu commit.",
      en: "The command that shows changed lines is named in the story. Once you know which file is right, stage only that file and commit.",
    },
  ],
  isGoalReached: (s) => {
    const id = getHeadCommitId(s);
    if (!id || s.commits[id].parents[0] !== BASE_ID) return false;
    const snap = headSnapshot(s);
    return snap["app.js"] === APP_NEW && snap["config.js"] === CONFIG_OLD;
  },
  mustRun: ["diff"],
  solution: [cmd("git diff"), cmd("git add app.js"), cmd('git commit -m "Add bye function"')],
};
