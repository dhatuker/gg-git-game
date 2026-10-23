"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type ChangeEvent } from "react";
import type { Lang } from "../i18n/types";
import { LOG_COMMAND, MAX_COMMITS, MAX_LOG_MB } from "../sandbox/import-log";
import { LanguageProvider, useLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { RichText } from "./RichText";
import { EMPTY_SANDBOX, parseSaved, reduceSandbox, SANDBOX_KEY, saveable, type SandboxState } from "./sandbox-state";
import { SiteHeader, switchLanguagePath } from "./SiteHeader";
import { Workspace } from "./Workspace";

/** Halaman sandbox (rute /[lang]/sandbox): impor riwayat, lalu mode bebas tanpa level. */
export default function SandboxPage({ lang }: { lang: Lang }) {
  return (
    <LanguageProvider lang={lang}>
      <SandboxView />
    </LanguageProvider>
  );
}

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

function SandboxView() {
  const [state, dispatch] = useReducer(reduceSandbox, EMPTY_SANDBOX);

  // Sesi dipulihkan setelah mount (reload atau ganti bahasa) agar HTML server dan client sama.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = parseSaved(storage()?.getItem(SANDBOX_KEY));
      if (saved) dispatch({ type: "restore", saved });
    } catch {
      // Storage diblokir: mulai dari layar impor.
    }
  }, []);

  // Simpan sumber + langkah (bukan seluruh repo) setiap kali sesi berubah.
  useEffect(() => {
    if (!restored.current) return;
    try {
      // Hanya menulis; menghapus dilakukan tombol "Impor lain", supaya render pertama (layar impor kosong)
      // tidak menghapus sesi yang sedang dipulihkan.
      const saved = saveable(state);
      if (saved) storage()?.setItem(SANDBOX_KEY, JSON.stringify(saved));
    } catch {
      // Kuota penuh atau storage diblokir: sesi tetap jalan, hanya tidak bertahan setelah reload.
    }
  }, [state]);

  if (!state.initial) return <ImportScreen state={state} dispatch={dispatch} />;
  return <SandboxWorkspace state={state} dispatch={dispatch} />;
}

/** PowerShell 5 menyimpan `>` sebagai UTF-16; file lain dibaca sebagai UTF-8. */
export function decodeLogFile(bytes: Uint8Array): string {
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes.length > 1 && bytes[1] === 0 && bytes[0] !== 0);
  return new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

const ERROR_KEY = { empty: "sandbox.errorEmpty", noCommits: "sandbox.errorNoCommits", tooLarge: "sandbox.errorTooLarge" } as const;

type Dispatch = (action: Parameters<typeof reduceSandbox>[1]) => void;

function ImportScreen({ state, dispatch }: { state: SandboxState; dispatch: Dispatch }) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LOG_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard tidak tersedia: pemain masih bisa memilih teks perintah secara manual.
    }
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Kosongkan pilihan agar file yang sama bisa dipilih lagi setelah diubah.
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOG_MB * 1024 * 1024) {
      dispatch({ type: "too-large" });
      return;
    }
    const content = decodeLogFile(new Uint8Array(await file.arrayBuffer()));
    setText(content);
    dispatch({ type: "load", source: { kind: "log", text: content } });
  };

  return (
    <div className="gg-page">
      <SiteHeader />
      <main className="gg-sbx">
        <header className="gg-sbx-head">
          <h1>{t("sandbox.title")}</h1>
          <p className="gg-lede">{t("sandbox.lede")}</p>
          <p className="gg-sbx-safe">
            <RichText text={t("sandbox.safe")} />
          </p>
        </header>

        <section className="gg-panel gg-sbx-step" aria-labelledby="gg-sbx-step1">
          <h2 id="gg-sbx-step1">{t("sandbox.step1")}</h2>
          <p className="gg-sbx-note">
            <RichText text={t("sandbox.step1Body", { max: MAX_COMMITS })} />
          </p>
          <div className="gg-sbx-cmd">
            <code>{LOG_COMMAND}</code>
            <button type="button" className="gg-btn gg-btn-sm" onClick={copy}>
              {copied ? t("sandbox.copied") : t("sandbox.copy")}
            </button>
          </div>
        </section>

        <section className="gg-panel gg-sbx-step" aria-labelledby="gg-sbx-step2">
          <h2 id="gg-sbx-step2">{t("sandbox.step2")}</h2>
          <label className="gg-sr-only" htmlFor="gg-sbx-paste">
            {t("sandbox.pasteLabel")}
          </label>
          <textarea
            id="gg-sbx-paste"
            className="gg-sbx-paste"
            rows={8}
            spellCheck={false}
            value={text}
            placeholder={t("sandbox.pastePlaceholder")}
            onChange={(e) => setText(e.target.value)}
          />
          {state.error && (
            <p className="gg-sbx-error" role="alert">
              <RichText text={t(ERROR_KEY[state.error], { max: MAX_LOG_MB })} />
            </p>
          )}
          <div className="gg-sbx-actions">
            <button type="button" className="gg-btn gg-btn-primary" onClick={() => dispatch({ type: "load", source: { kind: "log", text } })}>
              {t("sandbox.import")}
            </button>
            <label className="gg-btn gg-sbx-file">
              {t("sandbox.fileLabel")}
              <input type="file" accept=".txt,.log,text/plain" onChange={pickFile} />
            </label>
          </div>
        </section>

        <section className="gg-sbx-sample" aria-labelledby="gg-sbx-or">
          <h2 id="gg-sbx-or">{t("sandbox.or")}</h2>
          <p>
            <RichText text={t("sandbox.sampleBody")} />
          </p>
          <button type="button" className="gg-btn" onClick={() => dispatch({ type: "load", source: { kind: "sample" } })}>
            {t("sandbox.sample")}
          </button>
        </section>
      </main>
    </div>
  );
}

function SandboxPanel({ state }: { state: SandboxState }) {
  const { t } = useLang();
  const s = state.stats;
  return (
    <section className="gg-panel gg-level" aria-labelledby="gg-sbx-panel">
      <h2 id="gg-sbx-panel">{t("sandbox.panelTitle")}</h2>
      <p className="gg-story">
        <RichText text={t("sandbox.panelBody")} />
      </p>
      {s && <p className="gg-goal">{t("sandbox.stats", { commits: s.commits, branches: s.branches, files: s.files })}</p>}
      <ul className="gg-sbx-notes">
        {s && (
          <li>
            <RichText text={t("sandbox.notePlaceholder")} />
          </li>
        )}
        <li>
          <RichText text={t(state.initial?.remote ? "sandbox.noteRemote" : "sandbox.noteNoRemote")} />
        </li>
        {s && s.dropped > 0 && <li>{t("sandbox.dropped", { n: s.dropped, max: MAX_COMMITS })}</li>}
        {s && s.octopus > 0 && <li>{t("sandbox.octopus", { n: s.octopus })}</li>}
        {s && s.skipped > 0 && <li>{t("sandbox.skipped", { n: s.skipped })}</li>}
      </ul>
    </section>
  );
}

function SandboxWorkspace({ state, dispatch }: { state: SandboxState; dispatch: Dispatch }) {
  const { t, lang } = useLang();
  return (
    <div className="gg-shell">
      <header className="gg-learn-bar">
        <Link className="gg-btn gg-btn-sm" href={`/${lang}`} aria-label={t("sandbox.homeLabel")}>
          {t("sandbox.home")}
        </Link>
        <div className="gg-where">
          <h1>{t("site.sandbox")}</h1>
          <span>{t(state.source?.kind === "sample" ? "sandbox.sourceSample" : "sandbox.sourceLog")}</span>
        </div>
        <span className="gg-bar-spacer" />
        <LanguageToggle onSwitch={switchLanguagePath} />
        <button type="button" className="gg-btn gg-btn-sm" disabled={state.past.length === 0} onClick={() => dispatch({ type: "undo" })}>
          {t("sandbox.undo")}
        </button>
        <button type="button" className="gg-btn gg-btn-sm" onClick={() => dispatch({ type: "reset" })}>
          {t("sandbox.reset")}
        </button>
        <button
          type="button"
          className="gg-btn gg-btn-sm"
          onClick={() => {
            try {
              storage()?.removeItem(SANDBOX_KEY);
            } catch {
              // Storage diblokir: tidak ada yang perlu dihapus.
            }
            dispatch({ type: "close" });
          }}
        >
          {t("sandbox.newImport")}
        </button>
      </header>
      <Workspace
        session={state}
        top={<SandboxPanel state={state} />}
        terminalKey="sandbox"
        editor
        showStash
        showRemote={!!state.repo.remote}
        onRun={(input) => dispatch({ type: "run", input })}
        onWrite={(file, content) => dispatch({ type: "write", file, content })}
        onResolve={(file, choice) => dispatch({ type: "resolve", file, choice })}
      />
    </div>
  );
}
