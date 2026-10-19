export interface ParsedCommand {
  name: string;
  args: string[];
}

function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let hasToken = false;
  for (const ch of input) {
    if (ch === '"') {
      inQuote = !inQuote;
      hasToken = true;
    } else if (/\s/.test(ch) && !inQuote) {
      if (hasToken) tokens.push(current);
      current = "";
      hasToken = false;
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (inQuote) return null;
  if (hasToken) tokens.push(current);
  return tokens;
}

export function parseInput(input: string): ParsedCommand | { error: string } {
  const tokens = tokenize(input.trim());
  if (tokens === null) return { error: "Tanda kutip belum ditutup. Pastikan pesan diapit \"...\"." };
  if (tokens.length === 0) return { error: "Ketik sebuah perintah, misalnya `git status`." };
  if (tokens[0] !== "git") return { error: "Perintah harus diawali `git`, misalnya `git status`." };
  if (tokens.length === 1) return { error: "Tambahkan nama perintah setelah `git`, misalnya `git status`." };
  return { name: tokens[1], args: tokens.slice(2) };
}
