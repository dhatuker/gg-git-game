"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { formatLine, translate } from "../i18n/format";
import type { DictKey, Lang, Params, TLine } from "../i18n/types";
import type { Localized } from "../levels/types";

interface LangContext {
  lang: Lang;
  t: (key: DictKey, params?: Params) => string;
  tl: (text: Localized) => string;
  line: (line: TLine) => string;
}

const Ctx = createContext<LangContext | null>(null);

/** Bahasa ditentukan rute (`/id` atau `/en`), jadi HTML statis sudah dalam bahasa yang benar. */
export function LanguageProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<LangContext>(
    () => ({
      lang,
      t: (key, params) => translate(lang, key, params),
      tl: (text) => text[lang],
      line: (l) => formatLine(lang, l),
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang harus dipakai di dalam LanguageProvider");
  return ctx;
}
