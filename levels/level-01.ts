import { cmd, setup } from "./solve";
import type { Level } from "./types";

export const level01: Level = {
  id: 1,
  title: "Membuat repositori",
  story:
    "Kamu punya folder proyek berisi README.md, tapi git belum mengenalnya. `git init` mengubah folder biasa menjadi repositori: git mulai bisa mencatat riwayat di dalamnya.",
  goal: "Jadikan folder ini repositori git.",
  mode: "buttons",
  editor: false,
  allowedCommands: ["init"],
  buttons: [{ label: "git init", command: "git init" }],
  initialState: setup({ "README.md": "# Proyek Pertamaku" }),
  hints: ["Repositori dibuat dengan satu perintah saja.", "Klik tombol `git init`."],
  isGoalReached: (s) => s.initialized,
  solution: [cmd("git init")],
};
