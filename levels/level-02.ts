import { cmd, setup, write } from "./solve";
import type { Level } from "./types";

export const level02: Level = {
  id: 2,
  title: "Melihat status",
  story:
    "Working directory adalah folder tempat kamu bekerja. Git tidak otomatis melacak file baru. `git status` memberi tahu file mana yang baru, berubah, atau siap di-commit.",
  goal: "Buat file baru bernama catatan.txt lewat editor, lalu periksa dengan `git status`.",
  mode: "buttons",
  editor: true,
  allowedCommands: ["init", "status"],
  buttons: [{ label: "git status", command: "git status" }],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [{ kind: "cmd", input: "git init" }]),
  hints: [
    "Gunakan panel editor untuk membuat file baru bernama catatan.txt.",
    "Setelah file dibuat, klik `git status` dan lihat bagian \"File yang belum dilacak\".",
  ],
  isGoalReached: (s) => "catatan.txt" in s.files,
  mustRun: ["status"],
  solution: [write("catatan.txt", "Belajar git hari ini"), cmd("git status")],
};
