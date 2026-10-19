import { DICTS } from "./dicts";
import type { DictKey, Lang, Params, TLine } from "./types";

/** Isi `{param}` dalam satu kali lewat; nilai parameter tidak diproses ulang. */
export function translate(lang: Lang, key: DictKey, params?: Params): string {
  const template = DICTS[lang][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params && name in params ? String(params[name]) : whole,
  );
}

export function formatLine(lang: Lang, line: TLine): string {
  return "raw" in line ? line.raw : translate(lang, line.key, line.params);
}

export function formatLines(lang: Lang, lines: TLine[]): string {
  return lines.map((l) => formatLine(lang, l)).join("\n");
}
