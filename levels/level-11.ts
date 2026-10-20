import { getHeadCommitId } from "../engine/state";
import { projectSetup } from "./history";
import { cmd, write } from "./solve";
import type { Level } from "./types";

const APP_JS = "function init() {\n  track('open');\n}\ninit();";

export const level11: Level = {
  id: 11,
  title: {
    id: "Salah commit",
    en: "Wrong commit",
  },
  story: {
    id: "Kamu baru saja commit \"Add debug logging\", padahal belum waktunya. `reset` memindahkan branch ke commit lain, dan modenya menentukan nasib perubahan: `--soft` menyimpannya di staging, `--mixed` (bawaan) membiarkannya di working directory, `--hard` membuangnya sama sekali.",
    en: "You just made the commit \"Add debug logging\" too early. `reset` moves the branch to another commit, and the mode decides what happens to the changes: `--soft` keeps them staged, `--mixed` (the default) leaves them in the working directory, `--hard` throws them away.",
  },
  goal: {
    id: "Batalkan commit \"Add debug logging\" supaya HEAD kembali ke \"Refactor app init\", tapi jangan hilangkan baris debug di app.js.",
    en: "Undo the \"Add debug logging\" commit so HEAD goes back to \"Refactor app init\", but keep the debug line in app.js.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "branch", "switch", "checkout", "merge", "reset"],
  initialState: projectSetup([
    write("app.js", `${APP_JS}\nconsole.log('debug');`),
    cmd("git add ."),
    cmd('git commit -m "Add debug logging"'),
  ]),
  hints: [
    {
      id: "Kamu perlu memindahkan branch mundur satu commit, tapi perubahan di file harus tetap ada. Pilih mode reset yang tidak membuang isi file.",
      en: "You need to move the branch back one commit, but the file changes must stay. Pick a reset mode that does not throw away file content.",
    },
    {
      id: "Setelah itu cek hasilnya: lihat riwayat dengan log dan status file dengan status. Di graf, branch main akan bergeser satu commit ke belakang.",
      en: "Afterwards check the result: look at the history with log and the file state with status. In the graph, main moves back one commit.",
    },
    {
      id: "Bentuknya: reset, lalu sebuah mode, lalu penunjuk ke commit induk HEAD (tanda ~ diikuti jumlah langkah mundur).",
      en: "The shape: reset, then a mode, then a pointer to HEAD's parent commit (the ~ sign followed by the number of steps back).",
    },
  ],
  isGoalReached: (s) => {
    const head = getHeadCommitId(s);
    return (
      head !== null &&
      s.commits[head].message === "Refactor app init" &&
      Object.values(s.commits).some((c) => c.message === "Add debug logging") &&
      (s.files["app.js"] ?? "").includes("debug")
    );
  },
  solution: [cmd("git reset --soft HEAD~1")],
};
