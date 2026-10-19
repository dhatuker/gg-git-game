import { cmd, commitCount, setup, write } from "./solve";
import type { Level } from "./types";

export const level05: Level = {
  id: 5,
  title: "Membaca riwayat",
  story:
    "Setiap commit menyimpan id parent-nya, sehingga commit membentuk rantai riwayat. `git log` menelusuri rantai itu dari commit terbaru ke yang paling lama. Mulai level ini kamu juga bisa mengetik perintah sendiri di terminal.",
  goal: "Baca riwayat dengan `git log`, lalu tambahkan commit keempat (ubah atau buat file, stage, commit).",
  mode: "hybrid",
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log"],
  buttons: [
    { label: "git log", command: "git log" },
    { label: "git log --oneline", command: "git log --oneline" },
    { label: "git status", command: "git status" },
    { label: "git add .", command: "git add ." },
    { label: 'git commit -m "Commit keempat"', command: 'git commit -m "Commit keempat"' },
  ],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Tambah README"'),
    write("catatan.txt", "Belajar git hari ini"),
    cmd("git add ."),
    cmd('git commit -m "Tambah catatan"'),
    write("catatan.txt", "Belajar git hari ini\nSudah paham commit"),
    cmd("git add ."),
    cmd('git commit -m "Perbarui catatan"'),
  ]),
  hints: [
    "Jalankan `git log` atau `git log --oneline` untuk melihat 3 commit yang sudah ada.",
    "Ubah isi file di editor, lalu `git add .` dan `git commit -m \"pesan\"`.",
  ],
  isGoalReached: (s) => commitCount(s) >= 4,
  mustRun: ["log"],
  solution: [cmd("git log"), write("ide.txt", "Ide fitur baru"), cmd("git add ."), cmd('git commit -m "Commit keempat"')],
};
