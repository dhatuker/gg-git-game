import { PAD, type GraphLayout, type GraphNode } from "./layout";

/** Skala tampilan: ruang vertikal ekstra untuk label di atas stasiun. */
export const SX = 1.25;
export const SY = 2;
/** Jarak dari pusat stasiun ke tepi atas label pertama, dan jarak antar label bertumpuk. */
const LABEL_RISE = 40;
const LABEL_STEP = 26;

export interface GraphGeometry {
  /** Label per commit: branch dulu, lalu HEAD paling atas. */
  stacks: Map<string, string[]>;
  top: number;
  width: number;
  height: number;
  px: (n: GraphNode) => number;
  py: (n: GraphNode) => number;
  /** Tepi atas label ke-`index` (0 = paling dekat stasiun) di atas `n`. */
  labelY: (n: GraphNode, index: number) => number;
}

export function graphGeometry(layout: GraphLayout): GraphGeometry {
  const stacks = new Map<string, string[]>();
  for (const l of layout.labels) {
    const list = stacks.get(l.commitId) ?? [];
    if (l.kind === "branch") list.unshift(l.name);
    else list.push(l.name);
    stacks.set(l.commitId, list);
  }

  // Ruang atas harus cukup untuk tumpukan label tertinggi; minimal 76 seperti tata letak semula.
  const MARGIN = 4;
  let top = 76;
  for (const n of layout.nodes) {
    const count = stacks.get(n.id)?.length ?? 0;
    if (count === 0) continue;
    const needed = MARGIN + LABEL_RISE + (count - 1) * LABEL_STEP - (n.y - PAD) * SY;
    top = Math.max(top, needed);
  }
  const px = (n: GraphNode) => n.x * SX;
  const py = (n: GraphNode) => top + (n.y - PAD) * SY;
  const labelY = (n: GraphNode, index: number) => py(n) - LABEL_RISE - index * LABEL_STEP;
  const width = Math.max(layout.width * SX, 320);
  const height = top + (layout.height - PAD * 2) * SY + 48;
  return { stacks, top, width, height, px, py, labelY };
}

/** Posisi scrollLeft agar titik `headX` berada di sekitar 60% lebar area terlihat, dibatasi ke rentang konten. */
export function scrollLeftFor(headX: number, viewportWidth: number, contentWidth: number): number {
  const max = Math.max(0, contentWidth - viewportWidth);
  return Math.min(max, Math.max(0, Math.round(headX - viewportWidth * 0.6)));
}
