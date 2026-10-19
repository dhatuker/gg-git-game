import { cmd, headParents, setup, write } from "./solve";
import type { Level } from "./types";

export const level09: Level = {
  id: 9,
  title: "Merge commit",
  story:
    "Kali ini `main` dan `fitur` sama-sama punya commit baru, jadi riwayatnya bercabang. Pointer tidak bisa sekadar digeser. Git membuat merge commit: commit khusus dengan dua parent yang menyatukan kedua cabang.",
  goal: "Gabungkan `fitur` ke `main` dengan merge commit.",
  mode: "terminal",
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge"],
  buttons: [],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Commit pertama"'),
    cmd("git switch -c fitur"),
    write("fitur.txt", "Fitur login"),
    cmd("git add ."),
    cmd('git commit -m "Tambah fitur login"'),
    cmd("git switch main"),
    write("kontak.txt", "email: halo@contoh.id"),
    cmd("git add ."),
    cmd('git commit -m "Tambah kontak"'),
  ]),
  hints: [
    "Pastikan kamu di `main` (lihat label HEAD), lalu merge branch `fitur`.",
    "Ketik `git merge fitur` dan perhatikan commit baru dengan dua garis parent.",
  ],
  isGoalReached: (s) => headParents(s) === 2,
  solution: [cmd("git merge fitur")],
};
