import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level03: Level = {
  id: 3,
  title: "Staging area",
  story:
    "Sebelum disimpan, perubahan dimasukkan dulu ke staging area: semacam keranjang berisi apa saja yang akan masuk ke commit berikutnya. `git add` memindahkan file dari working directory ke staging.",
  goal: "Masukkan README.md dan catatan.txt ke staging area.",
  mode: "buttons",
  editor: false,
  allowedCommands: ["init", "status", "add"],
  buttons: [
    { label: "git status", command: "git status" },
    { label: "git add README.md", command: "git add README.md" },
    { label: "git add catatan.txt", command: "git add catatan.txt" },
    { label: "git add .", command: "git add ." },
  ],
  initialState: setup({ "README.md": "# Proyek Pertamaku", "catatan.txt": "Belajar git hari ini" }, [
    { kind: "cmd", input: "git init" },
  ]),
  hints: [
    "Perhatikan panel area: file perlu berpindah dari kolom Working ke Staging.",
    "Kamu bisa men-stage satu per satu, atau semuanya sekaligus dengan `git add .`.",
  ],
  isGoalReached: (s) => "README.md" in s.index && "catatan.txt" in s.index,
  solution: [cmd("git add .")],
};
