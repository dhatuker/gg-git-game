import { cmd, commitCount, setup, write } from "./solve";
import type { Level } from "./types";

export const level05: Level = {
  id: 5,
  title: {
    id: "Membaca riwayat",
    en: "Read the history",
  },
  story: {
    id: "Setiap commit menyimpan id parent-nya, sehingga commit membentuk rantai riwayat. `git log` menelusuri rantai itu dari commit terbaru ke yang paling lama.",
    en: "Every commit stores the id of its parent, so commits form a chain of history. `git log` walks that chain from the newest commit to the oldest.",
  },
  goal: {
    id: "Baca riwayat dengan `git log`, lalu tambahkan commit keempat (ubah atau buat file, stage, commit).",
    en: "Read the history with `git log`, then add a fourth commit (change or create a file, stage it, commit).",
  },
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log"],
  initialState: setup({ "README.md": "# My First Project" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Add README"'),
    write("notes.txt", "Learning git today"),
    cmd("git add ."),
    cmd('git commit -m "Add notes"'),
    write("notes.txt", "Learning git today\nI understand commits now"),
    cmd("git add ."),
    cmd('git commit -m "Update notes"'),
  ]),
  hints: [
    {
      id: "Mulailah dengan membaca riwayat. Perintahnya disebut di tujuan level, dan ada opsi `--oneline` untuk versi ringkas.",
      en: "Start by reading the history. The command is named in the level goal, and there is a `--oneline` option for a compact version.",
    },
    {
      id: "Untuk commit keempat, buat atau ubah file lewat Editor file lalu simpan. Perubahannya akan muncul di kolom Working.",
      en: "For the fourth commit, create or change a file in the File editor and save it. The change will appear in the Working column.",
    },
    {
      id: "Langkah selanjutnya sama seperti level 3 dan 4: pindahkan perubahan ke staging, lalu buat commit dengan pesan.",
      en: "The next steps are the same as levels 3 and 4: move the change into staging, then make a commit with a message.",
    },
  ],
  isGoalReached: (s) => commitCount(s) >= 4,
  mustRun: ["log"],
  solution: [cmd("git log"), write("idea.txt", "A new feature idea"), cmd("git add ."), cmd('git commit -m "Fourth commit"')],
};
