import { useLang } from "./LanguageProvider";
import { useEffect, useRef, type CSSProperties } from "react";
import { getHeadCommitId } from "../engine/state";
import type { GitEvent, RepoState } from "../engine/types";
import { highlightTargets } from "./highlight";
import { graphGeometry, scrollLeftFor } from "./graph-geometry";
import { useReducedMotion } from "./useReducedMotion";
import type { GraphLayout, GraphNode } from "./layout";

const LANES = 5;

const laneClass = (lane: number) => `gg-lane-${lane % LANES}`;

function edgePath(child: GraphNode, parent: GraphNode, px: (n: GraphNode) => number, py: (n: GraphNode) => number): string {
  const [x1, y1, x2, y2] = [px(parent), py(parent), px(child), py(child)];
  if (y1 === y2) return `M${x1},${y1} L${x2},${y2}`;
  const d = Math.min(Math.abs(y2 - y1), (x2 - x1) * 0.6);
  // Cabang keluar: belok diagonal di dekat parent. Merge masuk: belok diagonal di dekat child.
  return child.lane > parent.lane
    ? `M${x1},${y1} L${x1 + d},${y2} L${x2},${y2}`
    : `M${x1},${y1} L${x2 - d},${y1} L${x2},${y2}`;
}

function pillWidth(text: string): number {
  return text.length * 7.6 + 18;
}

interface Props {
  repo: RepoState;
  layout: GraphLayout;
  activeEvent: GitEvent | null;
}

export function GitGraph({ repo, layout, activeEvent }: Props) {
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const headId = getHeadCommitId(repo);

  // Riwayat panjang membuat graf lebih lebar dari panel: gulir otomatis agar HEAD selalu terlihat.
  useEffect(() => {
    const el = scrollRef.current;
    const head = layout.nodes.find((n) => n.id === headId);
    if (!el || !head) return;
    const left = scrollLeftFor(graphGeometry(layout).px(head), el.clientWidth, el.scrollWidth);
    el.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
  }, [layout, headId, reducedMotion]);

  if (!repo.initialized) {
    return <p className="gg-graph-empty">{t("ui.graphNoRepo")}</p>;
  }
  if (layout.nodes.length === 0) {
    return <p className="gg-graph-empty">{t("ui.graphNoCommits")}</p>;
  }

  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const hl = highlightTargets(activeEvent, repo.branches);
  const { stacks, width, height, px, py, labelY } = graphGeometry(layout);
  const conflictFrom = repo.mergeState?.fromCommit ?? repo.rebaseState?.current ?? null;

  return (
    <div className="gg-graph-scroll" ref={scrollRef}>
      <svg className="gg-graph" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("ui.graphTitle")}>
        <g>
          {layout.edges.map((e) => {
            const child = byId.get(e.from);
            const parent = byId.get(e.to);
            if (!child || !parent) return null;
            const lane = Math.max(child.lane, parent.lane);
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={edgePath(child, parent, px, py)}
                pathLength={1}
                className={`gg-edge ${laneClass(lane)}${e.orphan ? " gg-edge-orphan" : ""}`}
              />
            );
          })}
        </g>
        <g>
          {layout.nodes.map((n) => {
            const isMerge = repo.commits[n.id].parents.length > 1;
            const lit = hl.commits.includes(n.id);
            return (
              <g key={n.id} className={`gg-node ${laneClass(n.lane)}${isMerge ? " gg-node-merge" : ""}${n.orphan ? " gg-node-orphan" : ""}`} transform={`translate(${px(n)} ${py(n)})`}>
                <title>{n.orphan ? `${n.id}: ${n.message} (${t("ui.orphanNode")})` : `${n.id}: ${n.message}`}</title>
                {lit && <circle r={22} className="gg-node-halo" />}
                {conflictFrom === n.id && <circle r={19} className="gg-node-conflict" />}
                <circle r={isMerge ? 13 : 11} className="gg-node-dot" />
                <text y={30} className="gg-node-id">
                  {n.id}
                </text>
              </g>
            );
          })}
        </g>
        <g>
          {[...stacks.entries()].flatMap(([commitId, names]) => {
            const node = byId.get(commitId);
            if (!node) return [];
            return names.map((name, i) => {
              const w = pillWidth(name);
              const isHead = name === "HEAD";
              const style: CSSProperties = { transform: `translate(${px(node) - w / 2}px, ${labelY(node, i)}px)` };
              const lane = isHead ? 0 : (byId.get(repo.branches[name])?.lane ?? 0);
              return (
                <g
                  key={`label-${name}`}
                  className={`gg-label ${isHead ? "gg-label-head" : laneClass(lane)}${hl.labels.includes(name) ? " gg-label-lit" : ""}`}
                  style={style}
                >
                  <rect width={w} height={21} rx={10.5} />
                  <text x={w / 2} y={15}>
                    {name}
                  </text>
                </g>
              );
            });
          })}
        </g>
      </svg>
    </div>
  );
}
