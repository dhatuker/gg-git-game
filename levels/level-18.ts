import { REMOTE_URL, remoteWorld } from "./history";
import { cmd } from "./solve";
import type { Level } from "./types";

export const level18: Level = {
  id: 18,
  title: {
    id: "Ambil proyek",
    en: "Get the project",
  },
  story: {
    id: "Kamu baru bergabung dengan tim. Proyek Taskboard sudah ada di server tim, di alamat https://github.com/gg-team/taskboard.git, tetapi folder di komputermu masih kosong. Kamu perlu mengambil salinannya lebih dulu sebelum bisa bekerja.",
    en: "You just joined the team. The Taskboard project already lives on the team's server at https://github.com/gg-team/taskboard.git, but the folder on your computer is still empty. You need to get a copy of it before you can start working.",
  },
  goal: {
    id: "Ambil salinan proyek dari server tim ke folder ini, sehingga `main` lokal sama dengan `origin/main` dan file proyek (misalnya index.html) ada.",
    en: "Get a copy of the project from the team's server into this folder, so local `main` matches `origin/main` and the project files (for example index.html) are there.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase", "clone"],
  initialState: remoteWorld({ cloned: false }),
  hints: [
    {
      id: "Kamu tidak perlu membuat repo dari nol. Ada perintah yang menyalin seluruh proyek beserta riwayatnya dari tempat lain sekaligus.",
      en: "You do not need to create a repo from scratch. There is a command that copies a whole project, history included, from somewhere else in one go.",
    },
    {
      id: "Alamat proyek tertulis di cerita level ini. Setelah selesai, lihat grafnya: label `origin/main` muncul di samping `main`.",
      en: "The project address is written in this level's story. When it is done, look at the graph: the `origin/main` label shows up next to `main`.",
    },
    {
      id: "Bentuknya: perintah penyalin lalu alamat proyek. Salin alamatnya persis dari cerita.",
      en: "The shape is: the copying command, then the project address. Copy the address exactly from the story.",
    },
  ],
  mustRun: ["clone"],
  isGoalReached: (s) => {
    const remoteMain = s.remote?.branches.main;
    if (!s.initialized || remoteMain === undefined) return false;
    return s.branches["main"] === remoteMain && s.remoteRefs["main"] === remoteMain && s.files["index.html"] !== undefined;
  },
  solution: [cmd("git clone " + REMOTE_URL)],
};
