import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level01: Level = {
  id: 1,
  title: {
    id: "Membuat repositori",
    en: "Create a repository",
  },
  story: {
    id: "Kamu punya folder proyek berisi README.md, tapi git belum mengenalnya. `git init` mengubah folder biasa menjadi repositori: git mulai bisa mencatat riwayat di dalamnya. Ketik perintah di terminal, lalu tekan Enter.",
    en: "You have a project folder with a README.md, but git does not know about it yet. `git init` turns an ordinary folder into a repository: git can start recording history inside it. Type commands in the terminal and press Enter.",
  },
  goal: {
    id: "Jadikan folder ini repositori git.",
    en: "Turn this folder into a git repository.",
  },
  editor: false,
  allowedCommands: ["init"],
  initialState: setup({ "README.md": "# My First Project" }),
  hints: [
    {
      id: "Saat ini git belum mengenal folder ini. Lihat panel graf: belum ada repositori sama sekali.",
      en: "Right now git does not know this folder. Look at the graph panel: there is no repository at all yet.",
    },
    {
      id: "Yang kamu perlukan adalah perintah yang membuat repositori baru. Nama perintahnya ada di cerita level di atas.",
      en: "You need the command that creates a new repository. Its name is in the level story above.",
    },
    {
      id: "Semua perintah git diawali kata `git`, lalu satu kata perintah. Untuk level ini tidak perlu argumen tambahan.",
      en: "Every git command starts with the word `git`, followed by one command word. This level needs no extra arguments.",
    },
  ],
  isGoalReached: (s) => s.initialized,
  solution: [cmd("git init")],
};
