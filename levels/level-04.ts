import { cmd, commitCount, setup } from "./solve";
import type { Level } from "./types";

export const level04: Level = {
  id: 4,
  title: "Commit pertama",
  story:
    "Commit adalah snapshot: foto seluruh isi staging pada satu waktu, lengkap dengan pesan. Setiap commit mendapat id unik dan muncul sebagai titik di graf. Pesan commit ditulis setelah opsi `-m`, di dalam tanda kutip ganda.",
  goal: "Simpan isi staging sebagai commit pertama.",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit"],
  initialState: setup({ "README.md": "# Proyek Pertamaku", "catatan.txt": "Belajar git hari ini" }, [
    { kind: "cmd", input: "git init" },
    { kind: "cmd", input: "git add ." },
  ]),
  hints: [
    "Kedua file sudah ada di kolom Staging. Sekarang isinya perlu disimpan sebagai snapshot.",
    "Snapshot dibuat dengan perintah `git commit`. Git akan menolak kalau commit-nya tidak punya pesan.",
    "Pesan ditulis setelah opsi `-m`, di dalam tanda kutip ganda. Isi pesannya bebas, misalnya apa yang kamu simpan.",
  ],
  isGoalReached: (s) => commitCount(s) >= 1,
  solution: [cmd('git commit -m "Commit pertama"')],
};
