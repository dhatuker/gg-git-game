import { describe, expect, it } from "vitest";
import { runSessionInput } from "../../ui/session";
import { SANDBOX_COMMANDS } from "../../ui/sandbox-state";
import { exec, initRepo, keys, run, write } from "./helpers";

/** Nama yang juga properti bawaan objek JavaScript tidak boleh dianggap branch, file, atau perintah yang ada. */
const NAMES = ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"];

const oneCommit = () => run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "satu"');

describe("nama yang bentrok dengan properti Object.prototype", () => {
  it.each(NAMES)("git switch %s gagal dengan rapi (tidak melempar)", (name) => {
    const r = exec(oneCommit(), `git switch ${name}`);
    expect(r.ok).toBe(false);
    expect(keys(r)).toContain("switch.notFound");
  });

  it.each(NAMES.filter((n) => n !== "__proto__"))("git branch %s membuat branch baru lalu bisa dipakai", (name) => {
    const repo = run(oneCommit(), `git branch ${name}`);
    expect(Object.keys(repo.branches)).toContain(name);
    expect(run(repo, `git switch ${name}`).head).toEqual({ type: "branch", name });
  });

  it.each(NAMES)("git branch -d %s melaporkan branch tidak ada", (name) => {
    expect(keys(exec(oneCommit(), `git branch -d ${name}`))).toContain("branch.notFound");
  });

  it.each(NAMES)("git add %s melaporkan file tidak ada", (name) => {
    expect(keys(exec(oneCommit(), `git add ${name}`))).toContain("add.missingFile");
  });

  it.each(NAMES)("git diff %s melaporkan path tidak dikenal", (name) => {
    expect(keys(exec(oneCommit(), `git diff ${name}`))).toContain("diff.unknownPath");
  });

  it.each(NAMES)("git restore %s melaporkan path tidak dikenal", (name) => {
    expect(exec(oneCommit(), `git restore ${name}`).ok).toBe(false);
  });

  it.each(NAMES)("git %s dianggap perintah tidak dikenal, bukan perintah terkunci", (name) => {
    const r = runSessionInput({ repo: oneCommit(), lines: [], clearedAt: 0, events: [], caption: null }, `git ${name}`, SANDBOX_COMMANDS);
    const last = r.state.lines.at(-1);
    expect(last?.kind).toBe("error");
    expect(JSON.stringify(last)).toMatch(/command\.unknown/);
  });

  it.each(NAMES)("git help %s menampilkan bantuan umum dengan catatan perintah tidak dikenal", (name) => {
    const r = runSessionInput({ repo: oneCommit(), lines: [], clearedAt: 0, events: [], caption: null }, `git help ${name}`, SANDBOX_COMMANDS);
    expect(r.state.lines.at(-1)).toMatchObject({ kind: "help", unknown: name });
  });
});
