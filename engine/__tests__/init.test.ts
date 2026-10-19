import { describe, expect, it } from "vitest";
import { runCommand } from "../index";
import { createEmptyRepo } from "../state";

describe("git init", () => {
  it("membuat repo dengan HEAD di branch main", () => {
    const r = runCommand(createEmptyRepo(), "git init");
    expect(r.ok).toBe(true);
    expect(r.state.initialized).toBe(true);
    expect(r.state.head).toEqual({ type: "branch", name: "main" });
    expect(r.events).toEqual([{ type: "repo-dibuat" }]);
  });

  it("menolak init kedua kali", () => {
    const first = runCommand(createEmptyRepo(), "git init");
    expect(runCommand(first.state, "git init").ok).toBe(false);
  });

  it("menolak perintah lain sebelum init", () => {
    const r = runCommand(createEmptyRepo(), "git status");
    expect(r.ok).toBe(false);
    expect(r.output).toContain("bukan repositori git");
    expect(r.output).toContain("fatal: not a git repository");
  });

  it("menolak perintah yang tidak dikenal dengan menyebut namanya", () => {
    const repo = runCommand(createEmptyRepo(), "git init").state;
    const r = runCommand(repo, "git foo");
    expect(r.ok).toBe(false);
    expect(r.output).toContain("foo");
  });

  it("tidak melempar untuk input rusak", () => {
    const r = runCommand(createEmptyRepo(), 'git commit -m "x');
    expect(r.ok).toBe(false);
  });

  it("menyarankan perintah yang mirip untuk salah ketik", () => {
    const repo = runCommand(createEmptyRepo(), "git init").state;
    expect(runCommand(repo, "git comit -m x").output).toContain("git commit");
  });
});
