import { cmd, commitCount, setup } from "./solve";
import type { Level } from "./types";

export const level04: Level = {
  id: 4,
  title: {
    id: "Commit pertama",
    en: "First commit",
  },
  story: {
    id: "Commit adalah snapshot: foto seluruh isi staging pada satu waktu, lengkap dengan pesan. Setiap commit mendapat id unik dan muncul sebagai titik di graf. Pesan commit ditulis setelah opsi `-m`, di dalam tanda kutip ganda.",
    en: "A commit is a snapshot: a picture of everything in staging at one moment, together with a message. Every commit gets a unique id and appears as a dot on the graph. The commit message goes after the `-m` option, inside double quotes.",
  },
  goal: {
    id: "Simpan isi staging sebagai commit pertama.",
    en: "Save the contents of staging as the first commit.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit"],
  initialState: setup({ "README.md": "# My First Project", "notes.txt": "Learning git today" }, [cmd("git init"), cmd("git add .")]),
  hints: [
    {
      id: "Kedua file sudah ada di kolom Staging. Sekarang isinya perlu disimpan sebagai snapshot.",
      en: "Both files are already in the Staging column. Now their contents need to be saved as a snapshot.",
    },
    {
      id: "Snapshot dibuat dengan perintah `git commit`. Git akan menolak kalau commit-nya tidak punya pesan.",
      en: "A snapshot is made with the `git commit` command. Git refuses a commit that has no message.",
    },
    {
      id: "Pesan ditulis setelah opsi `-m`, di dalam tanda kutip ganda. Isi pesannya bebas, misalnya apa yang kamu simpan.",
      en: "The message goes after the `-m` option, inside double quotes. It can say anything, for example what you are saving.",
    },
  ],
  isGoalReached: (s) => commitCount(s) >= 1,
  solution: [cmd('git commit -m "First commit"')],
};
