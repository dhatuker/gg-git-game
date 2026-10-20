import { describe, expect, it } from "vitest";
import { createEmptyRepo } from "../state";
import { attachRemote, exec, initRepo, keys, paramsOf, rawText, run, teammateCommit, write } from "./helpers";
import { suggestCommand } from "../suggest";
import type { RepoState } from "../types";

const URL = "https://github.com/gg-team/taskboard.git";

function serverOnly(): RepoState {
  const seeded = attachRemote(run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "c1"'), URL);
  const withTeam = teammateCommit(seeded, "b.txt", "x", "teman");
  return { ...createEmptyRepo(), remote: { ...withTeam.remote!, connected: false } };
}

describe("git clone", () => {
  it("berhasil dari repo kosong", () => {
    const s = serverOnly();
    const r = exec(s, `git clone ${URL}`);
    expect(r.ok).toBe(true);
    const tip = s.remote!.branches.main;
    expect(r.state.initialized).toBe(true);
    expect(r.state.branches.main).toBe(tip);
    expect(r.state.remoteRefs.main).toBe(tip);
    expect(r.state.commits).toEqual(s.remote!.commits);
    expect(r.state.files).toEqual(s.remote!.commits[tip].snapshot);
    expect(r.state.index).toEqual(s.remote!.commits[tip].snapshot);
    expect(r.state.head).toEqual({ type: "branch", name: "main" });
    expect(r.state.remote!.connected).toBe(true);
    expect(r.events).toEqual([{ type: "clone-selesai", tip }]);
    expect(keys(r)).toEqual(["clone.done"]);
    expect(paramsOf(r, "clone.done")).toEqual({ url: URL });
  });

  it("menerima URL tanpa akhiran .git", () => {
    expect(exec(serverOnly(), "git clone https://github.com/gg-team/taskboard").ok).toBe(true);
  });

  it("URL lain gagal dengan state yang sama", () => {
    const s = serverOnly();
    const r = exec(s, "git clone https://github.com/x/y.git");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toEqual(["clone.notFound"]);
    expect(paramsOf(r, "clone.notFound")).toEqual({ url: "https://github.com/x/y.git" });
  });

  it("remote null gagal", () => {
    const s = createEmptyRepo();
    const r = exec(s, `git clone ${URL}`);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toEqual(["clone.notFound"]);
  });

  it("tanpa argumen dan argumen kedua gagal", () => {
    const s = serverOnly();
    const a = exec(s, "git clone");
    expect(a.ok).toBe(false);
    expect(a.state).toBe(s);
    expect(keys(a)).toEqual(["clone.needUrl"]);
    const b = exec(s, `git clone ${URL} folder`);
    expect(b.ok).toBe(false);
    expect(b.state).toBe(s);
    expect(keys(b)).toEqual(["clone.badArgs"]);
  });

  it("repo yang sudah initialized ditolak", () => {
    const s = attachRemote(initRepo(), URL);
    const r = exec(s, `git clone ${URL}`);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toEqual(["clone.alreadyInit"]);
  });
});

describe("git remote", () => {
  const connected = () => attachRemote(run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "c1"'), URL);

  it("remote -v mencetak dua baris raw saat terhubung", () => {
    const r = exec(connected(), "git remote -v");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual([]);
    expect(rawText(r)).toBe(`origin\t${URL} (fetch)\norigin\t${URL} (push)`);
  });

  it("remote -v kosong saat tidak terhubung", () => {
    const r = exec(initRepo(), "git remote -v");
    expect(r.ok).toBe(true);
    expect(r.output).toEqual([]);
  });

  it("remote polos mencetak origin", () => {
    expect(rawText(exec(connected(), "git remote"))).toBe("origin");
    expect(exec(initRepo(), "git remote").output).toEqual([]);
  });

  it("subperintah lain tidak didukung", () => {
    const s = connected();
    const r = exec(s, "git remote add x y");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toEqual(["remote.unsupported"]);
    expect(paramsOf(r, "remote.unsupported")).toEqual({ sub: "add" });
  });
});

describe("guard dan suggest", () => {
  it("git fetch pada repo belum init tetap repo.notInitialized", () => {
    expect(keys(exec(createEmptyRepo(), "git fetch"))).toEqual(["repo.notInitialized"]);
  });

  it("KNOWN_COMMANDS memuat perintah remote", () => {
    expect(suggestCommand("clon")).toBe("clone");
    expect(suggestCommand("pul")).toBe("pull");
    expect(suggestCommand("pusg")).toBe("push");
    expect(suggestCommand("fetc")).toBe("fetch");
    expect(suggestCommand("remot")).toBe("remote");
  });

  it("perintah yang belum terdaftar tetap lewat jalur unknown", () => {
    expect(keys(exec(initRepo(), "git push"))).toEqual(["command.unknown"]);
  });
});
