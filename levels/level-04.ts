import { cmd, commitCount, setup } from "./solve";
import type { Level } from "./types";

export const level04: Level = {
  id: 4,
  title: "Commit pertama",
  story:
    "Commit adalah snapshot: foto seluruh isi staging pada satu waktu, lengkap dengan pesan. Setiap commit mendapat id unik dan muncul sebagai titik di graf.",
  goal: "Simpan isi staging sebagai commit pertama.",
  mode: "buttons",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit"],
  buttons: [
    { label: "git status", command: "git status" },
    { label: 'git commit -m "Commit pertama"', command: 'git commit -m "Commit pertama"' },
  ],
  initialState: setup({ "README.md": "# Proyek Pertamaku", "catatan.txt": "Belajar git hari ini" }, [
    { kind: "cmd", input: "git init" },
    { kind: "cmd", input: "git add ." },
  ]),
  hints: [
    "Kedua file sudah ada di staging. Tinggal disimpan.",
    "Klik tombol `git commit` lalu lihat titik baru muncul di graf.",
  ],
  isGoalReached: (s) => commitCount(s) >= 1,
  solution: [cmd('git commit -m "Commit pertama"')],
};
