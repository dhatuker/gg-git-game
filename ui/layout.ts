import { getHeadCommitId, unreachableCommits } from "../engine/state";
import type { RepoState } from "../engine/types";

export interface GraphNode {
  id: string;
  message: string;
  x: number;
  y: number;
  lane: number;
  orphan: boolean;
}
export interface GraphEdge {
  from: string;
  to: string;
  orphan: boolean;
}
export interface GraphLabel {
  name: string;
  kind: "branch" | "head";
  commitId: string;
}
export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  labels: GraphLabel[];
  width: number;
  height: number;
}

export const X_STEP = 80;
export const Y_STEP = 60;
export const PAD = 40;

export function orderedBranches(state: RepoState): string[] {
  return Object.keys(state.branches).sort((a, b) => (a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b)));
}

export function computeGraphLayout(state: RepoState): GraphLayout {
  const commits = Object.values(state.commits).sort((a, b) => a.seq - b.seq);
  const depth: Record<string, number> = {};
  for (const c of commits) depth[c.id] = c.parents.length ? 1 + Math.max(...c.parents.map((p) => depth[p])) : 0;

  // Rantai: setiap branch (main dulu) mengklaim rantai parent pertamanya; sisanya (HEAD terlepas, commit dari
  // branch yang sudah dihapus) menjadi rantai sendiri.
  const chainOf: Record<string, number> = {};
  const chains: string[][] = [];
  const claim = (tip: string | undefined) => {
    if (!tip || tip in chainOf) return;
    const chain: string[] = [];
    for (let cur: string | undefined = tip; cur && !(cur in chainOf); cur = state.commits[cur].parents[0]) {
      chainOf[cur] = chains.length;
      chain.push(cur);
    }
    chains.push(chain);
  };
  for (const name of orderedBranches(state)) claim(state.branches[name]);
  if (state.head.type === "detached") claim(state.head.id);
  for (const c of [...commits].reverse()) claim(c.id);

  // Jalur: rantai pertama (main) di jalur 0. Rantai lain dikemas ke jalur terendah yang rentang kolomnya
  // (ditambah satu kolom di kiri-kanan untuk garis cabang dan merge) belum terpakai, agar riwayat panjang
  // dengan banyak cabang lama tetap ringkas tanpa node bertumpuk.
  const lane: Record<string, number> = {};
  const used: Array<Array<[number, number]>> = [];
  chains.forEach((chain, i) => {
    const ds = chain.map((id) => depth[id]);
    const span: [number, number] = [Math.min(...ds) - 1, Math.max(...ds) + 1];
    let l = i === 0 ? 0 : 1;
    while (used[l]?.some(([a, b]) => span[0] <= b && a <= span[1])) l++;
    (used[l] ??= []).push(span);
    for (const id of chain) lane[id] = l;
  });

  const orphans = new Set(unreachableCommits(state));
  const nodes: GraphNode[] = commits.map((c) => ({
    id: c.id,
    message: c.message,
    lane: lane[c.id],
    orphan: orphans.has(c.id),
    x: depth[c.id] * X_STEP + PAD,
    y: lane[c.id] * Y_STEP + PAD,
  }));
  const edges: GraphEdge[] = commits.flatMap((c) => c.parents.map((p) => ({ from: c.id, to: p, orphan: orphans.has(c.id) || orphans.has(p) })));
  const labels: GraphLabel[] = orderedBranches(state).map((name) => ({ name, kind: "branch", commitId: state.branches[name] }));
  const headId = getHeadCommitId(state);
  if (headId) labels.push({ name: "HEAD", kind: "head", commitId: headId });

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 0);
  return { nodes, edges, labels, width: maxX + PAD * 2, height: maxY + PAD * 2 };
}
