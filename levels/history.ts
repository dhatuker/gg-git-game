import type { RepoState } from "../engine/types";
import { createEmptyRepo } from "../engine/state";
import { applySteps, cmd, setup, write } from "./solve";
import type { SolutionStep } from "./types";

const commit = (message: string): SolutionStep[] => [cmd("git add ."), cmd(`git commit -m "${message}"`)];

/**
 * Riwayat proyek web tim yang sudah berjalan: 14 commit di `main`, termasuk dua merge commit dan satu
 * fast-forward dari branch tim. Label branch yang sudah di-merge dihapus, seperti kebiasaan tim sungguhan.
 */
export const PROJECT_HISTORY: SolutionStep[] = [
  cmd("git init"),
  ...commit("Initial commit"),
  write("index.html", "<h1>Taskboard</h1>"),
  ...commit("Add landing page"),
  write("style.css", "body { font-family: sans-serif; }"),
  ...commit("Add base styles"),
  write("app.js", "console.log('Taskboard');"),
  ...commit("Add app script"),

  cmd("git switch -c feature/login"),
  write("login.js", "export function login() {}"),
  ...commit("Add login form"),
  write("login.js", "export function login(user) {\n  if (!user) throw new Error('empty');\n}"),
  ...commit("Validate login input"),
  cmd("git switch main"),
  write("style.css", "body { font-family: sans-serif; }\nnav { display: flex; }"),
  ...commit("Style navbar"),
  cmd("git merge feature/login"),
  cmd("git branch -d feature/login"),

  cmd("git switch -c fix/navbar"),
  write("style.css", "body { font-family: sans-serif; }\nnav { display: flex; flex-wrap: wrap; }"),
  ...commit("Fix navbar overflow on mobile"),
  cmd("git switch main"),
  write("app.js", "console.log('Taskboard');\ntrack('open');"),
  ...commit("Add analytics hook"),
  cmd("git merge fix/navbar"),
  cmd("git branch -d fix/navbar"),

  cmd("git switch -c docs/contributing"),
  write("CONTRIBUTING.md", "Open a pull request for every change."),
  ...commit("Add contributing guide"),
  cmd("git switch main"),
  cmd("git merge docs/contributing"),
  cmd("git branch -d docs/contributing"),

  write("index.html", "<h1>Taskboard</h1>\n<footer>Made by the team</footer>"),
  ...commit("Add footer"),
  write("app.js", "function init() {\n  track('open');\n}\ninit();"),
  ...commit("Refactor app init"),
];

/** State awal level 5–10: proyek yang sudah berjalan, ditambah langkah khusus level. */
export function projectSetup(extra: SolutionStep[] = []): RepoState {
  return setup({ "README.md": "# My First Project" }, [...PROJECT_HISTORY, ...extra]);
}

export const REMOTE_URL = "https://github.com/gg-team/taskboard.git";

/**
 * Dunia level remote (lokal + remote). Riwayat remote = `projectSetup()` ditambah langkah `teammate`.
 * `cloned: false`: folder kosong, remote belum terhubung. `cloned: true`: salinan lokal sudah ada,
 * remote terhubung, `origin/main` masih di ujung `projectSetup()` (commit teman belum di-fetch),
 * lalu `local` dijalankan; seq commit lokal melanjutkan seq commit teman.
 */
export function remoteWorld(opts: { teammate?: SolutionStep[]; local?: SolutionStep[]; cloned: boolean }): RepoState {
  const base = projectSetup();
  const theirs = applySteps(structuredClone(base), opts.teammate ?? []);
  const remote = { url: REMOTE_URL, connected: false, branches: { ...theirs.branches }, commits: { ...theirs.commits } };
  if (!opts.cloned) return { ...createEmptyRepo(), remote };
  const local = {
    ...base,
    remote: { ...remote, connected: true },
    remoteRefs: { main: base.branches.main },
  };
  return applySteps(local, opts.local ?? []);
}
