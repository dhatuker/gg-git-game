"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LanguageProvider";
import { useReducedMotion } from "./useReducedMotion";

/** Tiap commit di demo punya hash dan message. `at` = langkah tempat elemen muncul. */
const COMMITS = [
  { hash: "a1b2c3d", msg: "demo.msgInitial", x: 50, y: 40, lane: 0, at: 1 },
  { hash: "e4f5a6b", msg: "demo.msgMenu", x: 130, y: 40, lane: 0, at: 2 },
  { hash: "c7d8e9f", msg: "demo.msgDark", x: 210, y: 100, lane: 1, at: 4 },
  { hash: "1a2b3c4", msg: "demo.msgMerge", x: 290, y: 40, lane: 0, at: 6 },
] as const;
const STEPS = 7;
const PAUSE_END = 3600;

export function HeroDemo() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState<number | null>(null);

  const msg = (k: (typeof COMMITS)[number]["msg"]) => t(k);
  const branch = t("demo.branch");
  const cmds = [
    "git init",
    `git commit -m "${msg("demo.msgInitial")}"`,
    `git commit -m "${msg("demo.msgMenu")}"`,
    `git switch -c ${branch}`,
    `git commit -m "${msg("demo.msgDark")}"`,
    "git switch main",
    `git merge ${branch} -m "${msg("demo.msgMerge")}"`,
  ];

  // Satu rangkaian pewaktu: ketik perintah, tampilkan hasilnya, jeda, lanjut; setelah selesai ulang dari awal.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number, fn: () => void) => {
      timer = setTimeout(() => alive && fn(), ms);
    };
    const play = (i: number) => {
      if (i >= STEPS) {
        wait(PAUSE_END, () => {
          setStep(0);
          setTyped(null);
          play(0);
        });
        return;
      }
      const len = cmds[i].length;
      const type = (c: number) => {
        setTyped(c);
        if (c < len) wait(36, () => type(c + 1));
        else
          wait(250, () => {
            setTyped(null);
            setStep(i + 1);
            wait(1500, () => play(i + 1));
          });
      };
      type(0);
    };
    play(0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // cmds depende dari bahasa lewat t; mulai ulang saat bahasa berganti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, t]);

  const shown = reduced ? STEPS : step;
  const visible = (at: number) => ({ opacity: shown >= at ? 1 : 0 });
  const caption = shown > 0 ? t(`demo.cap${shown - 1}` as "demo.cap0") : "";
  const pending = !reduced && typed !== null ? cmds[step].slice(0, typed) : "";

  const lane = (n: number) => `var(--lane-${n})`;
  const labelOf = (c: (typeof COMMITS)[number]) => (c.lane === 0 ? c.y + 26 : c.y + 26);

  return (
    <div className="gg-demo" role="group" aria-label={t("home.demoLabel")}>
      <div className="gg-demo-term" aria-hidden="true">
        {cmds.slice(0, shown).map((c, i) => (
          <div key={i}>
            <span className="gg-demo-prompt">$ </span>
            {c}
          </div>
        ))}
        <div>
          <span className="gg-demo-prompt">$ </span>
          {pending}
          <span className="gg-demo-cursor" />
        </div>
      </div>
      <svg className="gg-demo-svg" viewBox="0 0 360 150" role="img" aria-label={t("demo.graphLabel")}>
        <text x="8" y="24" className="gg-demo-lane">main</text>
        <text x="8" y="114" className="gg-demo-lane gg-demo-fade" style={visible(4)}>{branch}</text>
        <g style={visible(2)} className="gg-demo-fade"><line x1="50" y1="40" x2="130" y2="40" stroke={lane(0)} strokeWidth="5" /></g>
        <g style={visible(4)} className="gg-demo-fade"><path d="M130 40 C 160 40, 170 100, 210 100" fill="none" stroke={lane(1)} strokeWidth="5" /></g>
        <g style={visible(6)} className="gg-demo-fade">
          <line x1="130" y1="40" x2="290" y2="40" stroke={lane(0)} strokeWidth="5" />
          <path d="M210 100 C 250 100, 250 40, 290 40" fill="none" stroke={lane(1)} strokeWidth="5" />
        </g>
        {COMMITS.map((c, i) => (
          <g key={c.hash} style={visible(c.at)} className="gg-demo-fade">
            {i === 3 ? (
              <>
                <circle cx={c.x} cy={c.y} r="11" fill="var(--panel)" stroke={lane(0)} strokeWidth="5" />
                <circle cx={c.x} cy={c.y} r="3.5" fill={lane(1)} />
              </>
            ) : (
              <circle cx={c.x} cy={c.y} r="11" fill={lane(c.lane)} />
            )}
            <text x={c.x} y={labelOf(c)} textAnchor="middle" className="gg-demo-hash">{c.hash}</text>
            <text x={c.x} y={labelOf(c) + 13} textAnchor="middle" className="gg-demo-msg">{msg(c.msg)}</text>
          </g>
        ))}
      </svg>
      <p className="gg-demo-cap">{caption}</p>
    </div>
  );
}
