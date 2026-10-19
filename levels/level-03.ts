import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level03: Level = {
  id: 3,
  title: "Staging area",
  story:
    "Sebelum disimpan, perubahan dimasukkan dulu ke staging area: semacam keranjang berisi apa saja yang akan masuk ke commit berikutnya. `git add` memindahkan file dari working directory ke staging.",
  goal: "Masukkan README.md dan catatan.txt ke staging area.",
  editor: false,
  allowedCommands: ["init", "status", "add"],
  initialState: setup({ "README.md": "# Proyek Pertamaku", "catatan.txt": "Belajar git hari ini" }, [
    { kind: "cmd", input: "git init" },
  ]),
  hints: [
    "Lihat panel area: kedua file masih di kolom Working, padahal tujuannya di kolom Staging.",
    "Perintah untuk memindahkan file ke staging disebut di cerita level di atas.",
    "Perintah itu butuh argumen: nama file (boleh lebih dari satu, dipisah spasi), atau sebuah titik yang berarti semua file di folder ini.",
  ],
  isGoalReached: (s) => "README.md" in s.index && "catatan.txt" in s.index,
  solution: [cmd("git add .")],
};
