import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level06: Level = {
  id: 6,
  title: "Membuat branch",
  story:
    "Branch hanyalah pointer (label) yang menunjuk ke sebuah commit. Membuat branch tidak menyalin file apa pun: git hanya menambah label baru di commit yang sedang aktif.",
  goal: "Buat branch baru bernama `fitur`.",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch"],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [cmd("git init"), cmd("git add ."), cmd('git commit -m "Commit pertama"')]),
  hints: [
    "Branch hanyalah label. Membuatnya tidak mengubah file apa pun, hanya menambah label baru di graf.",
    "Nama perintahnya sama dengan nama konsepnya. Tanpa argumen, perintah itu hanya menampilkan daftar branch.",
    "Tambahkan nama branch yang diminta tujuan level sebagai argumen, lalu periksa daftar branch untuk memastikan.",
  ],
  isGoalReached: (s) => "fitur" in s.branches,
  solution: [cmd("git branch fitur")],
};
