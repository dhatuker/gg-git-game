import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level06: Level = {
  id: 6,
  title: "Membuat branch",
  story:
    "Branch hanyalah pointer (label) yang menunjuk ke sebuah commit. Membuat branch tidak menyalin file apa pun: git hanya menambah label baru di commit yang sedang aktif. Mulai sekarang kamu mengetik perintah sendiri.",
  goal: "Buat branch baru bernama `fitur`.",
  mode: "terminal",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch"],
  buttons: [],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [cmd("git init"), cmd("git add ."), cmd('git commit -m "Commit pertama"')]),
  hints: ["Perintahnya `git branch <nama>`.", "Ketik `git branch fitur`, lalu `git branch` untuk melihat daftarnya."],
  isGoalReached: (s) => "fitur" in s.branches,
  solution: [cmd("git branch fitur")],
};
