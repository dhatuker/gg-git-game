import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level03: Level = {
  id: 3,
  title: {
    id: "Staging area",
    en: "Staging area",
  },
  story: {
    id: "Sebelum disimpan, perubahan dimasukkan dulu ke staging area: semacam keranjang berisi apa saja yang akan masuk ke commit berikutnya. `git add` memindahkan file dari working directory ke staging.",
    en: "Before changes are saved, they go into the staging area first: a basket holding everything that will go into the next commit. `git add` moves files from the working directory into staging.",
  },
  goal: {
    id: "Masukkan README.md dan notes.txt ke staging area.",
    en: "Put README.md and notes.txt into the staging area.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add"],
  initialState: setup({ "README.md": "# My First Project", "notes.txt": "Learning git today" }, [cmd("git init")]),
  hints: [
    {
      id: "Lihat panel area: kedua file masih di kolom Working, padahal tujuannya di kolom Staging.",
      en: "Look at the area panel: both files are still in the Working column, but they belong in the Staging column.",
    },
    {
      id: "Perintah untuk memindahkan file ke staging disebut di cerita level di atas.",
      en: "The command that moves files into staging is named in the level story above.",
    },
    {
      id: "Perintah itu butuh argumen: nama file (boleh lebih dari satu, dipisah spasi), atau sebuah titik yang berarti semua file di folder ini.",
      en: "That command needs an argument: file names (more than one is fine, separated by spaces), or a single dot meaning every file in this folder.",
    },
  ],
  isGoalReached: (s) => "README.md" in s.index && "notes.txt" in s.index,
  solution: [cmd("git add .")],
};
