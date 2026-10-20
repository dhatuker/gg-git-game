import { remoteWorld } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

export const level20: Level = {
  id: 20,
  title: {
    id: "Ambil kabar terbaru",
    en: "Catch up",
  },
  story: {
    id: "Pagi ini teman satu tim sudah mendorong pekerjaannya ke server: ada panduan kontribusi baru dan judul README yang diperbarui. Komputermu belum tahu soal itu, jadi `main` kamu tertinggal dari server.",
    en: "This morning a teammate pushed their work to the server: a new contributing guide and an updated README title. Your computer does not know about it yet, so your `main` is behind the server.",
  },
  goal: {
    id: "Bawa pekerjaan teman ke komputermu, sehingga `main` lokal sama dengan `origin/main` dan ujung remote.",
    en: "Bring your teammate's work to your computer, so local `main` matches `origin/main` and the remote tip.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase", "clone", "push", "remote", "pull", "fetch"],
  initialState: remoteWorld({
    cloned: true,
    teammate: [
      write("CONTRIBUTING.md", "Open a pull request for every change.\nRun the tests first."),
      cmd("git add ."),
      cmd('git commit -m "Update contributing guide"'),
      write("README.md", "# Taskboard"),
      cmd("git add ."),
      cmd('git commit -m "Update readme title"'),
    ],
  }),
  hints: [
    {
      id: "Ada yang baru di server yang belum ada di komputermu. Cari perintah yang mengambil kabar terbaru dari sana.",
      en: "There is something new on the server that is not on your computer yet. Look for a command that brings the latest news from there.",
    },
    {
      id: "Bandingkan `origin/main` dan `main` di graf, lalu lihat ujung server di kotak Remote. Tujuanmu: keduanya berada di commit yang sama.",
      en: "Compare `origin/main` and `main` in the graph, then check the server's tip in the Remote box. Your goal: both sit on the same commit.",
    },
    {
      id: "Satu perintah tanpa argumen sudah cukup untuk mengambil sekaligus menggabungkan. Bisa juga dalam dua langkah: ambil dulu, lalu gabungkan.",
      en: "A single command with no arguments can both fetch and combine. You can also do it in two steps: fetch first, then merge.",
    },
  ],
  isGoalReached: (s) => {
    const r = s.remote;
    const tip = r?.branches.main;
    if (!r || tip === undefined) return false;
    return s.branches["main"] === tip && s.remoteRefs["main"] === tip;
  },
  solution: [cmd("git pull")],
};
