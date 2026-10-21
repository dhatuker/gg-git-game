import { msg, type Msg } from "./messages";

export interface ParsedCommand {
  name: string;
  args: string[];
}

/** Kutip "pintar" dari keyboard HP diperlakukan seperti kutip biasa. */
function normalizeQuotes(input: string): string {
  return input.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'");
}

/** Pecah input seperti shell: kutip ganda atau tunggal mengelompokkan kata; kutip jenis lain di dalamnya dibaca apa adanya. */
function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let hasToken = false;
  for (const ch of normalizeQuotes(input)) {
    if (quote ? ch === quote : ch === '"' || ch === "'") {
      quote = quote ? null : (ch as '"' | "'");
      hasToken = true;
    } else if (/\s/.test(ch) && !quote) {
      if (hasToken) tokens.push(current);
      current = "";
      hasToken = false;
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (quote) return null;
  if (hasToken) tokens.push(current);
  return tokens;
}

export function parseInput(input: string): ParsedCommand | { error: Msg } {
  const tokens = tokenize(input.trim());
  if (tokens === null) return { error: msg("parse.unclosedQuote") };
  if (tokens.length === 0) return { error: msg("parse.empty") };
  if (tokens[0] !== "git") return { error: msg("parse.notGit") };
  if (tokens.length === 1) return { error: msg("parse.missingCommand") };
  return { name: tokens[1], args: tokens.slice(2) };
}
