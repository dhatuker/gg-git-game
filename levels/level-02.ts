import { cmd, setup, write } from "./solve";
import type { Level } from "./types";

export const level02: Level = {
  id: 2,
  title: {
    id: "Melihat status",
    en: "Check the status",
  },
  story: {
    id: "Working directory adalah folder tempat kamu bekerja. Git tidak otomatis melacak file baru. `git status` memberi tahu file mana yang baru, berubah, atau siap di-commit.",
    en: "The working directory is the folder where you work. Git does not track new files automatically. `git status` tells you which files are new, changed, or ready to commit.",
  },
  goal: {
    id: "Buat file baru bernama notes.txt lewat editor, lalu periksa dengan `git status`.",
    en: "Create a new file named notes.txt in the editor, then check it with `git status`.",
  },
  editor: true,
  allowedCommands: ["init", "status"],
  initialState: setup({ "README.md": "# My First Project" }, [cmd("git init")]),
  hints: [
    {
      id: "Ada dua langkah: membuat file baru, lalu memeriksa bagaimana git melihatnya.",
      en: "There are two steps: create a new file, then check how git sees it.",
    },
    {
      id: "File dibuat lewat panel Editor file di bawah terminal: isi nama file, lalu klik \"Buat file\".",
      en: "Files are created in the File editor panel below the terminal: type a file name, then click \"Create file\".",
    },
    {
      id: "Perintah pemeriksaannya disebut di tujuan level. Setelah menjalankannya, cari bagian \"File yang belum dilacak\".",
      en: "The checking command is named in the level goal. After running it, look for the \"Untracked files\" section.",
    },
  ],
  isGoalReached: (s) => "notes.txt" in s.files,
  mustRun: ["status"],
  solution: [write("notes.txt", "Learning git today"), cmd("git status")],
};
