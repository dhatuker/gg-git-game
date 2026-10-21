import { projectSetup } from "./history";
import { cmd } from "./solve";
import type { Level } from "./types";

export const level10: Level = {
  id: 10,
  title: {
    id: "Membuat branch",
    en: "Create a branch",
  },
  story: {
    id: "Branch hanyalah pointer (label) yang menunjuk ke sebuah commit. Membuat branch tidak menyalin file apa pun: git hanya menambah label baru di commit yang sedang aktif.",
    en: "A branch is just a pointer (a label) that points at a commit. Creating a branch copies no files: git only adds a new label to the current commit.",
  },
  goal: {
    id: "Buat branch baru bernama `feature`.",
    en: "Create a new branch named `feature`.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore", "branch"],
  initialState: projectSetup(),
  hints: [
    {
      id: "Branch hanyalah label. Membuatnya tidak mengubah file apa pun, hanya menambah label baru di graf.",
      en: "A branch is only a label. Creating one changes no files; it just adds a new label to the graph.",
    },
    {
      id: "Nama perintahnya sama dengan nama konsepnya. Tanpa argumen, perintah itu hanya menampilkan daftar branch.",
      en: "The command has the same name as the concept. Without an argument, it only lists the branches.",
    },
    {
      id: "Tambahkan nama branch yang diminta tujuan level sebagai argumen, lalu periksa daftar branch untuk memastikan.",
      en: "Add the branch name from the level goal as the argument, then list the branches to make sure.",
    },
  ],
  isGoalReached: (s) => "feature" in s.branches,
  solution: [cmd("git branch feature")],
};
