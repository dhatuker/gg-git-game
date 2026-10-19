import { getHeadCommitId } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, headParents, write } from "./solve";
import type { Level } from "./types";

export const level10: Level = {
  id: 10,
  title: {
    id: "Konflik merge",
    en: "Merge conflict",
  },
  story: {
    id: "Kedua branch mengubah baris yang sama di README.md dengan isi berbeda. Git tidak bisa menebak mana yang benar, jadi merge berhenti dan menandai konflik dengan `<<<<<<<`, `=======`, `>>>>>>>`. Kamu yang memutuskan isinya.",
    en: "Both branches changed the same line in README.md in different ways. Git cannot guess which one is right, so the merge stops and marks the conflict with `<<<<<<<`, `=======`, `>>>>>>>`. You decide the content.",
  },
  goal: {
    id: "Merge `feature`, selesaikan konflik di README.md, lalu buat commit merge-nya.",
    en: "Merge `feature`, resolve the conflict in README.md, then create the merge commit.",
  },
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge"],
  initialState: projectSetup([
    cmd("git switch -c feature"),
    write("README.md", "# Awesome Project"),
    cmd("git add ."),
    cmd('git commit -m "Change title on feature"'),
    cmd("git switch main"),
    write("README.md", "# Great Project"),
    cmd("git add ."),
    cmd('git commit -m "Change title on main"'),
  ]),
  hints: [
    {
      id: "Mulailah seperti level sebelumnya: gabungkan `feature` ke `main`. Kali ini git akan berhenti di tengah jalan.",
      en: "Start like the previous level: merge `feature` into `main`. This time git will stop halfway.",
    },
    {
      id: "Buka README.md di Editor file. Pilih versi yang mau dipakai dengan tombol di atas isi file, atau edit sendiri lalu simpan.",
      en: "Open README.md in the File editor. Pick the version to keep with the buttons above the file content, or edit it yourself and save.",
    },
    {
      id: "Setelah isinya beres, beri tahu git bahwa konflik selesai dengan memasukkan file itu ke staging, lalu buat commit dengan pesan.",
      en: "Once the content is right, tell git the conflict is resolved by putting that file into staging, then make a commit with a message.",
    },
  ],
  isGoalReached: (s) => s.mergeState === null && getHeadCommitId(s) !== null && headParents(s) === 2,
  solution: [
    cmd("git merge feature"),
    { kind: "resolve", file: "README.md", choice: "ours" },
    cmd("git add README.md"),
    cmd('git commit -m "Resolve conflict"'),
  ],
};
