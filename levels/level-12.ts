import { getHeadCommitId, unreachableCommits } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, treeMatchesHead, write } from "./solve";
import type { Level } from "./types";

export const level12: Level = {
  id: 12,
  title: {
    id: "Buang eksperimen",
    en: "Discard the experiment",
  },
  story: {
    id: "Dua commit percobaan, \"Try experiment A\" dan \"Try experiment B\", ternyata jalan buntu. Dengan `reset --hard`, branch mundur dan file ikut dikembalikan. Commit-nya dibuang dari riwayat, tetapi masih terlihat samar di graf sampai git membersihkannya.",
    en: "Two experimental commits, \"Try experiment A\" and \"Try experiment B\", turned out to be a dead end. With `reset --hard`, the branch moves back and the files are restored too. The commits are dropped from the history, but they still show up faintly in the graph until git cleans them up.",
  },
  goal: {
    id: "Buang kedua commit eksperimen: HEAD kembali ke \"Refactor app init\" dan experiment.js hilang sepenuhnya.",
    en: "Discard both experiment commits: HEAD goes back to \"Refactor app init\" and experiment.js is gone completely.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset"],
  initialState: projectSetup([
    write("experiment.js", "export const a = 1;"),
    cmd("git add ."),
    cmd('git commit -m "Try experiment A"'),
    write("experiment.js", "export const a = 2;\nexport const b = 3;"),
    cmd("git add ."),
    cmd('git commit -m "Try experiment B"'),
  ]),
  hints: [
    {
      id: "Kamu perlu mundur dua commit sekaligus, dan file eksperimen harus ikut hilang dari working directory. Pilih mode reset yang paling tegas.",
      en: "You need to go back two commits at once, and the experiment file must disappear from the working directory too. Pick the most forceful reset mode.",
    },
    {
      id: "Perhatikan graf setelahnya: dua commit eksperimen tampil pudar karena tidak ada branch yang menunjuk ke sana lagi. Cek juga daftar file dengan status.",
      en: "Look at the graph afterwards: the two experiment commits appear faded because no branch points to them anymore. Also check the file list with status.",
    },
    {
      id: "Bentuknya: reset, lalu mode yang membuang perubahan, lalu penunjuk HEAD dengan tanda ~ dan jumlah commit yang dibuang.",
      en: "The shape: reset, then the mode that discards changes, then a HEAD pointer with the ~ sign and the number of commits to drop.",
    },
  ],
  isGoalReached: (s) => {
    const head = getHeadCommitId(s);
    return (
      head !== null &&
      s.commits[head].message === "Refactor app init" &&
      !("experiment.js" in s.files) &&
      treeMatchesHead(s) &&
      unreachableCommits(s).length >= 2
    );
  },
  solution: [cmd("git reset --hard HEAD~2")],
};
