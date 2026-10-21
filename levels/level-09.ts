import { getHeadCommitId, headSnapshot } from "../engine/state";
import { applySteps, cmd, setup, write } from "./solve";
import type { Level } from "./types";

const TYPO = "Add lgoin page";

const BASE = setup({ "index.html": "<h1>Home</h1>" }, [cmd("git init"), cmd("git add ."), cmd('git commit -m "Initial commit"')]);
const BASE_ID = getHeadCommitId(BASE);

export const level09: Level = {
  id: 9,
  title: { id: "Memperbaiki commit terakhir", en: "Fixing the last commit" },
  story: {
    id: "Kamu baru saja commit halaman login, lalu sadar dua hal: pesannya salah ketik (`lgoin`) dan `login.css` lupa ikut. Daripada menambah commit perbaikan, `git commit --amend` mengganti commit terakhir dengan versi baru. Commit lama tidak hilang; ia digambar pudar karena tidak lagi ditunjuk branch.",
    en: "You just committed the login page, then noticed two things: the message has a typo (`lgoin`) and `login.css` was left out. Instead of adding a fix-up commit, `git commit --amend` replaces the last commit with a new version. The old commit does not vanish; it is drawn faded because no branch points to it anymore.",
  },
  goal: {
    id: "Perbaiki commit terakhir: sertakan login.css dan betulkan pesannya, tanpa menambah commit baru di atasnya.",
    en: "Fix the last commit: include login.css and correct the message, without adding a new commit on top of it.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore"],
  initialState: applySteps(BASE, [
    write("login.html", "<form></form>"),
    write("login.css", "form { margin: auto; }"),
    cmd("git add login.html"),
    cmd(`git commit -m "${TYPO}"`),
  ]),
  hints: [
    {
      id: "Lihat panel area: login.css masih di kolom Working dan belum dilacak, jadi harus masuk staging dulu.",
      en: "Look at the area panel: login.css is still in the Working column and untracked, so it has to go into staging first.",
    },
    {
      id: "Commit biasa akan menambah satu titik lagi di graf. Yang diminta adalah mengganti commit terakhir.",
      en: "A normal commit would add one more point to the graph. What you need is to replace the last commit.",
    },
    {
      id: "Setelah login.css di-stage, pakai opsi dari cerita bersama pesan baru lewat `-m`.",
      en: "Once login.css is staged, use the option from the story together with a new message via `-m`.",
    },
  ],
  isGoalReached: (s) => {
    const id = getHeadCommitId(s);
    if (!id) return false;
    const head = s.commits[id];
    return head.parents.length === 1 && head.parents[0] === BASE_ID && "login.css" in headSnapshot(s) && head.message !== TYPO;
  },
  solution: [cmd("git add login.css"), cmd('git commit --amend -m "Add login page"')],
};
