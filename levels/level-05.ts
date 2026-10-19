import { cmd, commitCount, setup, write } from "./solve";
import type { Level } from "./types";

export const level05: Level = {
  id: 5,
  title: "Membaca riwayat",
  story:
    "Setiap commit menyimpan id parent-nya, sehingga commit membentuk rantai riwayat. `git log` menelusuri rantai itu dari commit terbaru ke yang paling lama.",
  goal: "Baca riwayat dengan `git log`, lalu tambahkan commit keempat (ubah atau buat file, stage, commit).",
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log"],
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
    "Mulailah dengan membaca riwayat. Perintahnya disebut di tujuan level, dan ada opsi `--oneline` untuk versi ringkas.",
    "Untuk commit keempat, buat atau ubah file lewat Editor file lalu simpan. Perubahannya akan muncul di kolom Working.",
    "Langkah selanjutnya sama seperti level 3 dan 4: pindahkan perubahan ke staging, lalu buat commit dengan pesan.",
  ],
  isGoalReached: (s) => commitCount(s) >= 4,
  mustRun: ["log"],
  solution: [cmd("git log"), write("ide.txt", "Ide fitur baru"), cmd("git add ."), cmd('git commit -m "Commit keempat"')],
};
