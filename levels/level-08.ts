import { getHeadCommitId, headSnapshot } from "../engine/state";
import { applySteps, cmd, setup, write } from "./solve";
import type { Level } from "./types";

const APP_NEW = "console.log('v2');";

const BASE = setup({ "app.js": "console.log('v1');" }, [cmd("git init"), cmd("git add ."), cmd('git commit -m "Initial commit"')]);
const BASE_ID = getHeadCommitId(BASE);

export const level08: Level = {
  id: 8,
  title: { id: "Keluarkan dari staging", en: "Unstaging a file" },
  story: {
    id: "Kamu menjalankan `git add .` dan tanpa sadar ikut men-stage `.env`, file berisi kata sandi database. Sebelum commit, `git diff --staged` menunjukkan isi yang akan masuk ke commit. `git restore --staged <file>` mengeluarkan file dari staging tanpa menghapus isinya.",
    en: "You ran `git add .` and accidentally staged `.env`, a file with the database password. Before committing, `git diff --staged` shows what will go into the commit. `git restore --staged <file>` takes a file out of staging without deleting its contents.",
  },
  goal: {
    id: "Periksa isi staging, keluarkan .env dari staging, lalu commit perubahan app.js saja.",
    en: "Check what is staged, take .env out of staging, then commit only the app.js change.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore"],
  initialState: applySteps(BASE, [write("app.js", APP_NEW), write(".env", "DB_PASSWORD=hunter2"), cmd("git add .")]),
  hints: [
    {
      id: "Lihat panel area: dua file ada di kolom Staging, padahal hanya satu yang boleh ikut commit.",
      en: "Look at the area panel: two files are in the Staging column, but only one may go into the commit.",
    },
    {
      id: "`git diff` biasa kosong karena semuanya sudah di-stage. Ada opsi untuk membandingkan staging dengan commit terakhir.",
      en: "Plain `git diff` is empty because everything is already staged. There is an option that compares staging with the last commit.",
    },
    {
      id: "Mengeluarkan file dari staging memakai perintah dari level sebelumnya ditambah satu opsi yang disebut di cerita. Setelah itu commit seperti biasa.",
      en: "Taking a file out of staging uses the command from the previous level plus one option named in the story. Then commit as usual.",
    },
  ],
  isGoalReached: (s) => {
    const id = getHeadCommitId(s);
    if (!id || s.commits[id].parents[0] !== BASE_ID) return false;
    const snap = headSnapshot(s);
    return snap["app.js"] === APP_NEW && !(".env" in snap) && ".env" in s.files;
  },
  mustRun: ["diff", "restore"],
  solution: [cmd("git diff --staged"), cmd("git restore --staged .env"), cmd('git commit -m "Update app log"')],
};
