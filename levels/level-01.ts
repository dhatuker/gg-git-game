import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level01: Level = {
  id: 1,
  title: "Membuat repositori",
  story:
    "Kamu punya folder proyek berisi README.md, tapi git belum mengenalnya. `git init` mengubah folder biasa menjadi repositori: git mulai bisa mencatat riwayat di dalamnya. Ketik perintah di terminal, lalu tekan Enter.",
  goal: "Jadikan folder ini repositori git.",
  editor: false,
  allowedCommands: ["init"],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }),
  hints: [
    "Saat ini git belum mengenal folder ini. Lihat panel graf: belum ada repositori sama sekali.",
    "Yang kamu perlukan adalah perintah yang membuat repositori baru. Nama perintahnya ada di cerita level di atas.",
    "Semua perintah git diawali kata `git`, lalu satu kata perintah. Untuk level ini tidak perlu argumen tambahan.",
  ],
  isGoalReached: (s) => s.initialized,
  solution: [cmd("git init")],
};
