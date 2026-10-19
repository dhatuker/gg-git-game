import { cmd, setup, write } from "./solve";
import type { Level } from "./types";

export const level02: Level = {
  id: 2,
  title: "Melihat status",
  story:
    "Working directory adalah folder tempat kamu bekerja. Git tidak otomatis melacak file baru. `git status` memberi tahu file mana yang baru, berubah, atau siap di-commit.",
  goal: "Buat file baru bernama catatan.txt lewat editor, lalu periksa dengan `git status`.",
  editor: true,
  allowedCommands: ["init", "status"],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [{ kind: "cmd", input: "git init" }]),
  hints: [
    "Ada dua langkah: membuat file baru, lalu memeriksa bagaimana git melihatnya.",
    "File dibuat lewat panel Editor file di bawah terminal: isi nama file, lalu klik \"Buat file\".",
    "Perintah pemeriksaannya disebut di tujuan level. Setelah menjalankannya, cari bagian \"File yang belum dilacak\".",
  ],
  isGoalReached: (s) => "catatan.txt" in s.files,
  mustRun: ["status"],
  solution: [write("catatan.txt", "Belajar git hari ini"), cmd("git status")],
};
