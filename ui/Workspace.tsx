"use client";

import { useMemo, type ReactNode } from "react";
import { activeConflicts } from "../engine/state";
import type { TMsg } from "../i18n/types";
import { AreaPanel } from "./AreaPanel";
import { FileEditor } from "./FileEditor";
import { GitGraph } from "./GitGraph";
import { computeGraphLayout } from "./layout";
import { useLang } from "./LanguageProvider";
import { RichText } from "./RichText";
import { inputHistory, type Session } from "./session";
import { Terminal } from "./Terminal";
import { useEventQueue } from "./useEventQueue";

function Caption({ message }: { message: TMsg | null }) {
  const { line } = useLang();
  return (
    <p className="gg-caption" aria-live="polite">
      {message && <RichText text={line(message)} />}
    </p>
  );
}

interface Props {
  session: Session;
  /** Panel di atas terminal (misalnya panel level atau panel sandbox). */
  top: ReactNode;
  /** Kunci terminal: ganti nilainya untuk mengosongkan input dan riwayat ↑/↓ lokal. */
  terminalKey: string | number;
  editor: boolean;
  showStash: boolean;
  showRemote: boolean;
  onRun: (input: string) => void;
  onWrite: (file: string, content: string) => void;
  onResolve: (file: string, choice: "ours" | "theirs") => void;
}

/** Kolom kiri (panel atas, terminal, editor) dan kanan (graf, area) yang dipakai halaman level dan sandbox. */
export function Workspace({ session, top, terminalKey, editor, showStash, showRemote, onRun, onWrite, onResolve }: Props) {
  const { t } = useLang();
  const layout = useMemo(() => computeGraphLayout(session.repo), [session.repo]);
  const queue = useEventQueue(session.events);
  const history = useMemo(() => inputHistory(session.lines), [session.lines]);
  return (
    <main className="gg-work">
      <div className="gg-left">
        {top}
        <Terminal key={terminalKey} lines={session.lines.slice(session.clearedAt)} history={history} onSubmit={onRun} />
        {editor && (
          <FileEditor
            files={session.repo.files}
            conflicts={activeConflicts(session.repo)}
            rebasing={!!session.repo.rebaseState}
            onWrite={onWrite}
            onResolve={onResolve}
          />
        )}
      </div>

      <div className="gg-right">
        <section className="gg-panel gg-graph-panel" aria-label={t("ui.graphTitle")}>
          <div className="gg-graph-head">
            <h3 className="gg-section-title">{t("ui.graphTitle")}</h3>
            {queue.playing && (
              <button type="button" className="gg-btn" onClick={queue.skip}>
                {t("ui.skipAnimation")}
              </button>
            )}
          </div>
          <GitGraph repo={session.repo} layout={layout} activeEvent={queue.active} />
          <Caption message={session.caption} />
        </section>
        <section className="gg-panel" aria-label={t("ui.areasLabel")}>
          <AreaPanel repo={session.repo} activeEvent={queue.active} showStash={showStash} showRemote={showRemote} />
        </section>
      </div>
    </main>
  );
}
