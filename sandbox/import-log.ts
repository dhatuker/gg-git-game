import { createEmptyRepo, isValidBranchName } from "../engine/state";
import { hasOwn } from "../engine/own";
import type { Commit, Files, RemoteState, RepoState } from "../engine/types";

/** Penanda awal tiap commit di keluaran `git log`; berupa teks biasa agar tetap utuh saat disalin dari terminal. */
export const RECORD_MARK = "@@@";

/** Batas commit yang diimpor; commit yang lebih lama dipotong seperti shallow clone. */
export const MAX_COMMITS = 300;

/** Perintah yang disarankan ke pemain. Hasilnya ditempel atau diunggah sebagai file teks. */
export const LOG_COMMAND = `git log --all --topo-order --reverse -n ${MAX_COMMITS} --name-status --pretty=format:"${RECORD_MARK}%H|%P|%D|%s"`;

/** URL remote simulasi; bukan alamat sungguhan, jadi push tidak mungkin sampai ke repo asli. */
export const SANDBOX_REMOTE_URL = "sandbox://origin";

export interface ImportStats {
  commits: number;
  branches: number;
  files: number;
  /** Commit lama di luar batas `MAX_COMMITS` yang dibuang. */
  dropped: number;
  /** Commit yang parent-nya tidak ikut diimpor (batas riwayat). */
  shallow: number;
  /** Merge dengan lebih dari dua parent; hanya dua parent pertama yang disimpan. */
  octopus: number;
  /** Baris yang tidak dikenali dan dilewati. */
  skipped: number;
}

export type ImportResult = { ok: true; state: RepoState; stats: ImportStats } | { ok: false; error: "empty" | "noCommits" };

interface RawCommit {
  hash: string;
  parents: string[];
  refs: string[];
  subject: string;
  changes: Array<{ status: string; path: string; to?: string }>;
}

const HASH = /^[0-9a-f]{7,64}$/i;
const STATUS = /^([AMDTCRUX])\d*$/;

/** Pecah baris name-status. Tab bisa berubah jadi spasi saat disalin dari terminal, jadi spasi juga diterima. */
function parseChange(line: string): RawCommit["changes"][number] | null {
  const parts = line.includes("\t") ? line.split("\t") : line.trim().split(/\s+/);
  const m = STATUS.exec(parts[0] ?? "");
  if (!m || parts.length < 2) return null;
  const status = m[1];
  if ((status === "R" || status === "C") && parts.length >= 3) return { status, path: parts[1], to: parts[2] };
  return { status, path: line.includes("\t") ? parts[1] : parts.slice(1).join(" ") };
}

function parseRecords(text: string): { records: RawCommit[]; skipped: number } {
  const records: RawCommit[] = [];
  let skipped = 0;
  let current: RawCommit | null = null;
  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const at = line.indexOf(RECORD_MARK);
    if (at !== -1) {
      const fields = line.slice(at + RECORD_MARK.length).split("|");
      const hash = (fields[0] ?? "").trim();
      if (!HASH.test(hash) || fields.length < 4) {
        skipped++;
        current = null;
        continue;
      }
      current = {
        hash: hash.toLowerCase(),
        parents: fields[1].trim().split(/\s+/).filter((p) => HASH.test(p)).map((p) => p.toLowerCase()),
        refs: fields[2].split(",").map((r) => r.trim()).filter(Boolean),
        subject: fields.slice(3).join("|").trim(),
        changes: [],
      };
      records.push(current);
      continue;
    }
    if (line.trim() === "") continue;
    const change = current ? parseChange(line) : null;
    if (change && current) current.changes.push(change);
    else skipped++;
  }
  return { records, skipped };
}

/** Log tanpa `--reverse` berurutan terbaru-dulu; balik dulu agar urutannya sama dengan log `--reverse`. */
function newestLast(records: RawCommit[]): RawCommit[] {
  const index = new Map(records.map((r, i) => [r.hash, i]));
  let before = 0;
  let after = 0;
  for (const [i, r] of records.entries()) {
    for (const p of r.parents) {
      const j = index.get(p);
      if (j === undefined) continue;
      if (j < i) before++;
      else after++;
    }
  }
  return after > before ? [...records].reverse() : records;
}

/** Urutkan parent sebelum anak (urutan asli dipertahankan bila sudah benar), agar log tanpa `--reverse` tetap bisa dipakai. */
function topoOrder(records: RawCommit[]): RawCommit[] {
  const byHash = new Map(records.map((r) => [r.hash, r]));
  const done = new Set<string>();
  const out: RawCommit[] = [];
  const visit = (start: RawCommit) => {
    const stack: Array<{ r: RawCommit; i: number }> = [{ r: start, i: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (done.has(top.r.hash)) {
        stack.pop();
        continue;
      }
      const parent = top.r.parents.slice(top.i).map((p) => byHash.get(p)).find((p) => p && !done.has(p.hash));
      if (parent && !stack.some((s) => s.r === parent)) {
        top.i = top.r.parents.indexOf(parent.hash) + 1;
        stack.push({ r: parent, i: 0 });
        continue;
      }
      done.add(top.r.hash);
      out.push(top.r);
      stack.pop();
    }
  };
  for (const r of records) visit(r);
  return out;
}

/** Panjang hash pendek terkecil (minimal 7) yang masih unik untuk semua commit. */
function shortLength(hashes: string[]): number {
  for (let n = 7; n < 64; n++) if (new Set(hashes.map((h) => h.slice(0, n))).size === hashes.length) return n;
  return 64;
}

/** Isi file buatan: commit yang terakhir mengubah file. Konflik tetap muncul saat dua cabang mengubah file yang sama. */
const fileContent = (path: string, id: string) => `${path} @ ${id}`;

/** Gabungkan snapshot parent merge: per file, ambil versi dari commit yang paling baru mengubahnya. */
function mergeSnapshots(snapshots: Files[], seqOf: Record<string, number>): Files {
  const out: Files = { ...snapshots[0] };
  for (const other of snapshots.slice(1)) {
    for (const [path, content] of Object.entries(other)) {
      const mine = out[path];
      const age = (c: string) => seqOf[c.slice(c.lastIndexOf(" @ ") + 3)] ?? -1;
      if (mine === undefined || age(content) > age(mine)) out[path] = content;
    }
  }
  return out;
}

/**
 * Ubah keluaran `git log` (format `LOG_COMMAND`) menjadi state repo untuk sandbox.
 * Isi file asli tidak ikut: tiap file berisi teks buatan yang menandai commit terakhir yang mengubahnya.
 */
export function importGitLog(text: string): ImportResult {
  if (text.trim() === "") return { ok: false, error: "empty" };
  const parsed = parseRecords(text);
  // Satu commit bisa muncul dua kali bila log ditempel ganda; ambil yang pertama.
  const seen = new Set<string>();
  const unique = parsed.records.filter((r) => !seen.has(r.hash) && seen.add(r.hash));
  if (unique.length === 0) return { ok: false, error: "noCommits" };

  const records = topoOrder(newestLast(unique)).slice(-MAX_COMMITS);
  const len = shortLength(records.map((r) => r.hash));
  const idOf = new Map(records.map((r) => [r.hash, r.hash.slice(0, len)]));

  const commits: Record<string, Commit> = {};
  const seqOf: Record<string, number> = {};
  let shallow = 0;
  let octopus = 0;
  records.forEach((r, seq) => {
    const id = idOf.get(r.hash) as string;
    seqOf[id] = seq;
    const known = r.parents.map((p) => idOf.get(p)).filter((p): p is string => !!p && !!commits[p]);
    if (known.length < r.parents.length) shallow++;
    if (known.length > 2) octopus++;
    const parents = known.slice(0, 2);
    const snapshot = parents.length ? mergeSnapshots(parents.map((p) => commits[p].snapshot), seqOf) : {};
    for (const c of r.changes) {
      if (c.status === "D") delete snapshot[c.path];
      else if (c.status === "R" && c.to) {
        delete snapshot[c.path];
        snapshot[c.to] = fileContent(c.to, id);
      } else snapshot[c.to ?? c.path] = fileContent(c.to ?? c.path, id);
    }
    commits[id] = { id, seq, parents, message: r.subject, snapshot };
  });

  const branches: Record<string, string> = {};
  const remoteRefs: Record<string, string> = {};
  let headBranch: string | null = null;
  let detached: string | null = null;
  for (const r of records) {
    const id = idOf.get(r.hash) as string;
    for (const ref of r.refs) {
      if (ref.startsWith("tag: ")) continue;
      if (ref === "HEAD") {
        detached = id;
        continue;
      }
      if (ref.startsWith("HEAD -> ")) {
        headBranch = ref.slice("HEAD -> ".length);
        if (isValidBranchName(headBranch)) branches[headBranch] = id;
        continue;
      }
      if (ref.startsWith("origin/")) {
        const name = ref.slice("origin/".length);
        if (name !== "HEAD" && isValidBranchName(name)) remoteRefs[name] = id;
        continue;
      }
      if (!ref.endsWith("/HEAD") && isValidBranchName(ref)) branches[ref] = id;
    }
  }

  // Tanpa branch lokal (misalnya log dari CI), buat satu dari remote atau dari commit terakhir.
  if (Object.keys(branches).length === 0) {
    const fromRemote = ["main", "master"].find((b) => hasOwn(remoteRefs, b)) ?? Object.keys(remoteRefs)[0];
    const lastId = idOf.get(records[records.length - 1].hash) as string;
    branches[fromRemote ?? "main"] = fromRemote ? remoteRefs[fromRemote] : lastId;
  }
  const branchNames = Object.keys(branches);
  const head: RepoState["head"] =
    detached && !headBranch
      ? { type: "detached", id: detached }
      : { type: "branch", name: headBranch && hasOwn(branches, headBranch) ? headBranch : (["main", "master"].find((b) => hasOwn(branches, b)) ?? branchNames[0]) };

  const headId = head.type === "branch" ? branches[head.name] : head.id;
  const snapshot = commits[headId].snapshot;
  // Remote simulasi hanya untuk `main`, karena push/pull/fetch di game ini bekerja di branch itu.
  const remote: RemoteState | null = remoteRefs.main
    ? { url: SANDBOX_REMOTE_URL, connected: true, branches: { main: remoteRefs.main }, commits: { ...commits } }
    : null;

  const state: RepoState = {
    ...createEmptyRepo(),
    initialized: true,
    files: { ...snapshot },
    index: { ...snapshot },
    commits,
    branches,
    head,
    remote,
    remoteRefs,
  };
  const files = new Set(Object.values(commits).flatMap((c) => Object.keys(c.snapshot)));
  return {
    ok: true,
    state,
    stats: {
      commits: records.length,
      branches: branchNames.length,
      files: files.size,
      dropped: unique.length - records.length,
      shallow,
      octopus,
      skipped: parsed.skipped,
    },
  };
}
