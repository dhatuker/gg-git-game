import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand } from "../../engine";
import { activeConflicts, getHeadCommitId } from "../../engine/state";
import type { RepoState } from "../../engine/types";
import { importGitLog, LOG_COMMAND, MAX_COMMITS, RECORD_MARK, SANDBOX_REMOTE_URL } from "../import-log";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

function imported(text: string): RepoState {
  const r = importGitLog(text);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function run(state: RepoState, input: string): RepoState {
  const r = runCommand(state, input);
  if (!r.ok) throw new Error(`${input}: ${JSON.stringify(r.output)}`);
  return r.state;
}

/** Riwayat linear buatan: n commit, masing-masing mengubah satu file. */
function linear(n: number): string {
  const hash = (i: number) => `${i.toString(16).padStart(8, "0")}${"0".repeat(32)}`;
  return Array.from({ length: n }, (_, i) => `${RECORD_MARK}${hash(i + 1)}|${i ? hash(i) : ""}|${i === n - 1 ? "HEAD -> main" : ""}|c${i + 1}\nM\tf${i % 3}.txt\n`).join("\n");
}

describe("importGitLog: riwayat nyata", () => {
  const s = imported(fixture("small.txt"));

  it("mengimpor semua commit dengan hash pendek 7 karakter dan pesan apa adanya", () => {
    expect(Object.keys(s.commits)).toHaveLength(9);
    expect(Object.keys(s.commits).every((id) => id.length === 7)).toBe(true);
    expect(Object.values(s.commits).map((c) => c.message)).toContain("Add login | form");
  });

  it("memetakan branch lokal, HEAD, dan origin/*, tag diabaikan", () => {
    expect(s.branches).toEqual({ main: "6de14c9", "feature/login": "e5093da", docs: "19cf100" });
    expect(s.head).toEqual({ type: "branch", name: "main" });
    expect(s.remoteRefs).toEqual({ main: "34d79c2" });
    expect(s.remote).toMatchObject({ url: SANDBOX_REMOTE_URL, connected: true, branches: { main: "34d79c2" } });
  });

  it("merge commit punya dua parent dan isi file gabungan", () => {
    const merge = s.commits["6ebda2a"];
    expect(merge.parents).toEqual(["fa5dafe", "e5093da"]);
    expect(Object.keys(merge.snapshot).sort()).toEqual(["README.md", "a.txt", "b.txt", "login.js"]);
  });

  it("rename dan delete diterapkan ke snapshot", () => {
    expect(Object.keys(s.commits["19cf100"].snapshot).sort()).toEqual(["DOCS.md", "a.txt"]);
  });

  it("working directory dan staging = snapshot HEAD", () => {
    const head = s.commits[getHeadCommitId(s) as string].snapshot;
    expect(s.files).toEqual(head);
    expect(s.index).toEqual(head);
  });

  it("log yang terbaru-dulu (tanpa --reverse) memberi hasil yang sama", () => {
    expect(imported(fixture("small-newest-first.txt"))).toEqual(s);
  });

  it("perintah git berjalan di atas riwayat impor, termasuk konflik yang realistis", () => {
    // docs dan feature/login sama-sama mengubah a.txt sejak commit "Add b".
    let t = run(s, "git switch docs");
    const r = runCommand(t, "git merge feature/login");
    expect(activeConflicts(r.state)).toEqual(["a.txt"]);
    t = run(s, "git switch -c coba main");
    t = run(t, "git switch main");
    t = run(t, "git push");
    expect(t.remoteRefs.main).toBe(s.branches.main);
  });

  it("push hanya mengubah remote simulasi; state impor tidak berubah", () => {
    const before = structuredClone(s);
    run(s, "git push");
    expect(s).toEqual(before);
  });
});

describe("importGitLog: masukan sulit", () => {
  it("teks kosong dan teks tanpa commit ditolak", () => {
    expect(importGitLog("   ")).toEqual({ ok: false, error: "empty" });
    expect(importGitLog("halo\ndunia")).toEqual({ ok: false, error: "noCommits" });
  });

  it("tab yang berubah jadi spasi (salin dari terminal) dan CRLF tetap terbaca", () => {
    const text = fixture("small.txt").replace(/\t/g, "    ").replace(/\n/g, "\r\n");
    expect(Object.keys(imported(text).commits["19cf100"].snapshot).sort()).toEqual(["DOCS.md", "a.txt"]);
  });

  it("baris asing dilewati dan dihitung", () => {
    const r = importGitLog(`$ git log ...\n${fixture("small.txt")}\nwarning: sesuatu`);
    expect(r.ok && r.stats.skipped).toBe(2);
  });

  it(`memotong ke ${MAX_COMMITS} commit terbaru dan menandai commit pertama sebagai batas`, () => {
    const r = importGitLog(linear(MAX_COMMITS + 20));
    if (!r.ok) throw new Error();
    expect(r.stats).toMatchObject({ commits: MAX_COMMITS, dropped: 20, shallow: 1 });
    const roots = Object.values(r.state.commits).filter((c) => c.parents.length === 0);
    expect(roots).toHaveLength(1);
    expect(roots[0].message).toBe("c21");
  });

  it("tanpa branch lokal, branch dibuat dari origin/main", () => {
    const text = `${RECORD_MARK}${"b".repeat(40)}|||root\nA\tx\n${RECORD_MARK}${"c".repeat(40)}|${"b".repeat(40)}|origin/main, origin/HEAD|next\nM\tx`;
    const s = imported(text);
    expect(s.branches).toEqual({ main: "ccccccc" });
    expect(s.head).toEqual({ type: "branch", name: "main" });
  });

  it("HEAD terlepas dikenali", () => {
    const text = `${RECORD_MARK}${"b".repeat(40)}||main|root\nA\tx\n${RECORD_MARK}${"c".repeat(40)}|${"b".repeat(40)}|HEAD|next\nM\tx`;
    expect(imported(text).head).toEqual({ type: "detached", id: "ccccccc" });
  });

  it("merge octopus disimpan dengan dua parent pertama", () => {
    const h = (c: string) => c.repeat(40);
    const text = [`${RECORD_MARK}${h("1")}|||a\nA\ta`, `${RECORD_MARK}${h("2")}|${h("1")}||b\nA\tb`, `${RECORD_MARK}${h("3")}|${h("1")}||c\nA\tc`, `${RECORD_MARK}${h("4")}|${h("1")}||d\nA\td`, `${RECORD_MARK}${h("5")}|${h("2")} ${h("3")} ${h("4")}|HEAD -> main|octo`].join("\n");
    const r = importGitLog(text);
    if (!r.ok) throw new Error();
    expect(r.stats.octopus).toBe(1);
    expect(r.state.commits["5555555"].parents).toEqual(["2222222", "3333333"]);
  });

  it("hash pendek diperpanjang bila 7 karakter tidak unik", () => {
    const text = `${RECORD_MARK}abcdef01${"0".repeat(32)}|||a\n${RECORD_MARK}abcdef02${"0".repeat(32)}|abcdef01${"0".repeat(32)}|HEAD -> main|b`;
    expect(Object.keys(imported(text).commits).sort()).toEqual(["abcdef01", "abcdef02"]);
  });

  it("perintah yang disarankan memakai format yang dibaca importer", () => {
    expect(LOG_COMMAND).toContain(`--pretty=format:"${RECORD_MARK}%H|%P|%D|%s"`);
    expect(LOG_COMMAND).toContain("--name-status");
  });
});

describe("nama ref yang bentrok dengan properti Object.prototype", () => {
  it.each(["__proto__", "constructor", "toString"])("log dengan branch %s tetap bisa diimpor", (name) => {
    const r = importGitLog(`@@@aaaaaaa||HEAD -> ${name}, origin/${name}|x\nA\tf\n`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const head = r.state.head;
    const headId = head.type === "branch" ? r.state.branches[head.name] : head.id;
    expect(r.state.commits[headId]).toBeDefined();
  });
});
