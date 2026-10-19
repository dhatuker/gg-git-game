import { getHeadCommitId } from "../engine/state";
import { cmd, headParents, setup, write } from "./solve";
import type { Level } from "./types";

export const level10: Level = {
  id: 10,
  title: "Konflik merge",
  story:
    "Kedua branch mengubah baris yang sama di README.md dengan isi berbeda. Git tidak bisa menebak mana yang benar, jadi merge berhenti dan menandai konflik dengan `<<<<<<<`, `=======`, `>>>>>>>`. Kamu yang memutuskan isinya.",
  goal: "Merge `fitur`, selesaikan konflik di README.md, lalu buat commit merge-nya.",
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge"],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }, [
    cmd("git init"),
    cmd("git add ."),
    cmd('git commit -m "Commit pertama"'),
    cmd("git switch -c fitur"),
    write("README.md", "# Proyek Keren"),
    cmd("git add ."),
    cmd('git commit -m "Ganti judul di fitur"'),
    cmd("git switch main"),
    write("README.md", "# Proyek Hebat"),
    cmd("git add ."),
    cmd('git commit -m "Ganti judul di main"'),
  ]),
  hints: [
    "Mulailah seperti level sebelumnya: gabungkan `fitur` ke `main`. Kali ini git akan berhenti di tengah jalan.",
    "Buka README.md di Editor file. Pilih versi yang mau dipakai dengan tombol di atas isi file, atau edit sendiri lalu simpan.",
    "Setelah isinya beres, beri tahu git bahwa konflik selesai dengan memasukkan file itu ke staging, lalu buat commit dengan pesan.",
  ],
  isGoalReached: (s) => s.mergeState === null && getHeadCommitId(s) !== null && headParents(s) === 2,
  solution: [
    cmd("git merge fitur"),
    { kind: "resolve", file: "README.md", choice: "ours" },
    cmd("git add README.md"),
    cmd('git commit -m "Selesaikan konflik"'),
  ],
};
