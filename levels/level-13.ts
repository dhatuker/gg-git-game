import { getHeadCommitId, isReachable } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, idByMessage, treeMatchesHead, write } from "./solve";
import type { Level } from "./types";

const APP_BEFORE = "function init() {\n  track('open');\n}\ninit();";
const APP_RISKY = `${APP_BEFORE}\ntrack('every-keystroke');`;
const INDEX_NEW = "<h1>Taskboard</h1>\n<footer>Made with care by the team</footer>";

const initialState = projectSetup([
  write("app.js", APP_RISKY),
  cmd("git add ."),
  cmd('git commit -m "Add risky tracking"'),
  write("index.html", INDEX_NEW),
  cmd("git add ."),
  cmd('git commit -m "Update footer text"'),
]);

export const level13: Level = {
  id: 13,
  title: {
    id: "Batalkan tanpa menulis ulang",
    en: "Undo without rewriting",
  },
  story: {
    id: "Commit \"Add risky tracking\" ternyata bermasalah, tetapi sudah ada commit \"Update footer text\" sesudahnya, dan riwayat yang sudah dibagikan tidak boleh ditulis ulang. `revert` membuat commit baru yang membalik efek sebuah commit lama, sementara riwayat aslinya tetap utuh.",
    en: "The \"Add risky tracking\" commit turned out to be a problem, but \"Update footer text\" already came after it, and shared history must not be rewritten. `revert` creates a new commit that reverses the effect of an old commit, while the original history stays intact.",
  },
  goal: {
    id: "Batalkan efek \"Add risky tracking\" dengan commit baru: app.js kembali seperti semula, teks footer baru tetap ada, dan riwayat lama tidak hilang.",
    en: "Undo the effect of \"Add risky tracking\" with a new commit: app.js is back to how it was, the new footer text stays, and the old history is not lost.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset", "revert"],
  initialState,
  hints: [
    {
      id: "Mundur dengan reset akan ikut membuang commit footer. Cari perintah yang membatalkan satu commit tertentu dengan cara menambah commit baru.",
      en: "Going back with reset would throw away the footer commit too. Look for the command that cancels one specific commit by adding a new commit.",
    },
    {
      id: "Lihat riwayat dengan log untuk menemukan id commit yang bermasalah. Id itu yang kamu berikan ke perintah pembatal.",
      en: "Check the history with log to find the id of the problematic commit. That id is what you give to the undoing command.",
    },
    {
      id: "Bentuknya: nama perintah pembatal, lalu id commit \"Add risky tracking\". Git akan menyiapkan pesan commit yang diawali kata Revert.",
      en: "The shape: the undoing command's name, then the id of the \"Add risky tracking\" commit. Git prepares a commit message that starts with the word Revert.",
    },
  ],
  isGoalReached: (s) => {
    const head = getHeadCommitId(s);
    const old = Object.values(s.commits).find((c) => c.message === "Update footer text");
    return (
      head !== null &&
      s.commits[head].message.startsWith("Revert") &&
      s.files["app.js"] === APP_BEFORE &&
      (s.files["index.html"] ?? "").includes("Made with care") &&
      old !== undefined &&
      isReachable(s, head, old.id) &&
      treeMatchesHead(s)
    );
  },
  solution: [cmd(`git revert ${idByMessage(initialState, "Add risky tracking")}`)],
};
