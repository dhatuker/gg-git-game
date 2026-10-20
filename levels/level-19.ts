import { remoteWorld } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

const initialState = remoteWorld({ cloned: true, local: [write("notes.txt", "Standup notes")] });
const startTip = initialState.remote?.branches.main;

export const level19: Level = {
  id: 19,
  title: {
    id: "Kirim pekerjaanmu",
    en: "Send your work",
  },
  story: {
    id: "Proyek sudah kamu salin. Hari ini kamu menulis catatan standup di notes.txt. Catatan itu baru ada di komputermu; teman satu tim belum bisa melihatnya sampai kamu mengirimnya ke server tim.",
    en: "You already have a copy of the project. Today you wrote your standup notes in notes.txt. They only exist on your computer; your teammates cannot see them until you send them to the team's server.",
  },
  goal: {
    id: "Commit notes.txt lalu kirim ke server tim, sehingga `main` di remote sama dengan `main` lokal dan memuat notes.txt.",
    en: "Commit notes.txt and send it to the team's server, so `main` on the remote matches local `main` and contains notes.txt.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase", "clone", "push", "remote"],
  initialState,
  hints: [
    {
      id: "Commit hanya menyimpan pekerjaan di komputermu. Untuk membagikannya ke tim, ada perintah lain yang mengirim commit ke server.",
      en: "A commit only saves work on your computer. To share it with the team, another command sends commits to the server.",
    },
    {
      id: "Lihat kotak Remote: ia menunjukkan ujung server. Setelah commit-mu terkirim, ujung itu pindah ke commit barumu dan `origin/main` ikut maju di graf.",
      en: "Look at the Remote box: it shows the server's tip. Once your commit is sent, that tip moves to your new commit and `origin/main` advances in the graph.",
    },
    {
      id: "Siapkan commit-nya dulu seperti biasa, lalu jalankan perintah pengirim. Argumen `origin` dan `main` boleh dipakai, boleh juga tidak.",
      en: "Prepare the commit first as usual, then run the sending command. The `origin` and `main` arguments are optional.",
    },
  ],
  mustRun: ["push"],
  isGoalReached: (s) => {
    const r = s.remote;
    if (!r || !r.connected) return false;
    const tip = r.branches.main;
    if (tip === undefined || tip === startTip || tip !== s.branches["main"]) return false;
    return r.commits[tip]?.snapshot["notes.txt"] !== undefined;
  },
  solution: [cmd("git add ."), cmd('git commit -m "Add notes"'), cmd("git push")],
};
