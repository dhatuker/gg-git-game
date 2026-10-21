import { getHeadCommitId, isReachable } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

const APP_WIP = "function init() {\n  track('open');\n}\ninit();\nrenderSidebar(); // work in progress";

const INITIAL = projectSetup([cmd("git branch hotfix"), write("app.js", APP_WIP)]);
const INITIAL_MAIN = INITIAL.branches["main"];

export const level18: Level = {
  id: 18,
  title: {
    id: "Simpan sementara",
    en: "Set it aside",
  },
  story: {
    id: "Kamu sedang setengah jalan mengerjakan app.js ketika ada bug mendesak di branch `hotfix`. Coba pindah ke sana dulu: git menolak karena ada perubahan yang belum di-commit. Kamu belum mau commit kerjaan setengah jadi ini. `stash` menyimpannya di rak sementara supaya working directory bersih, lalu bisa diambil lagi nanti.",
    en: "You are halfway through editing app.js when an urgent bug shows up on the `hotfix` branch. Try moving there first: git refuses because of uncommitted changes. You do not want to commit this half-done work. `stash` puts it on a temporary shelf so the working directory is clean, and you can take it back later.",
  },
  goal: {
    id: "Perbaiki bug di `hotfix` dengan satu commit, lalu kembali ke `main` dengan kerjaan setengah jadi di app.js utuh dan rak stash kosong.",
    en: "Fix the bug on `hotfix` with a commit, then return to `main` with the half-done work in app.js intact and the stash shelf empty.",
  },
  editor: true,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore", "branch", "switch", "checkout", "merge", "reset", "revert", "stash"],
  initialState: INITIAL,
  hints: [
    {
      id: "Coba pindah ke `hotfix` langsung dan baca pesan gagalnya. Kerjaanmu harus disimpan sementara dulu, tanpa di-commit.",
      en: "Try moving to `hotfix` directly and read the failure message. Your work has to be set aside first, without committing it.",
    },
    {
      id: "Setelah working directory bersih, pindah ke `hotfix`, buat perbaikan (misalnya di style.css), lalu add dan commit seperti biasa.",
      en: "Once the working directory is clean, move to `hotfix`, make a fix (for example in style.css), then add and commit as usual.",
    },
    {
      id: "Kembali ke `main`, lalu ambil lagi kerjaan yang disimpan sementara tadi dengan subperintah yang mengeluarkannya dari rak (bukan sekadar melihat daftar).",
      en: "Go back to `main`, then bring back the work you set aside using the subcommand that takes it off the shelf (not just listing it).",
    },
  ],
  mustRun: ["stash"],
  isGoalReached: (s) => {
    const main = s.branches["main"];
    const hotfix = s.branches["hotfix"];
    return (
      s.head.type === "branch" &&
      s.head.name === "main" &&
      s.files["app.js"] === APP_WIP &&
      s.stash.length === 0 &&
      // main tidak berubah; perbaikan berupa commit baru di atas hotfix (bukan amend di main).
      main === INITIAL_MAIN &&
      hotfix !== undefined &&
      hotfix !== INITIAL_MAIN &&
      isReachable(s, hotfix, INITIAL_MAIN) &&
      getHeadCommitId(s) === main
    );
  },
  solution: [
    cmd("git stash"),
    cmd("git switch hotfix"),
    write("style.css", "body { font-family: sans-serif; }\nnav { display: flex; flex-wrap: wrap; }\n/* fix navbar typo */"),
    cmd("git add ."),
    cmd('git commit -m "Fix navbar typo"'),
    cmd("git switch main"),
    cmd("git stash pop"),
  ],
};
