export type DiffOp = " " | "-" | "+";

export interface DiffLine {
  op: DiffOp;
  text: string;
}

/** String kosong berarti nol baris; selain itu dipecah per "\n". */
function toLines(text: string): string[] {
  return text === "" ? [] : text.split("\n");
}

/**
 * Diff per baris dengan LCS. Baris yang berubah ditulis sebagai hapus lalu tambah, seperti git.
 * File di game pendek, jadi tabel O(n·m) cukup.
 */
export function diffLines(a: string, b: string): DiffLine[] {
  const x = toLines(a);
  const y = toLines(b);
  // lcs[i][j] = panjang LCS dari x[i..] dan y[j..]
  const lcs = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      out.push({ op: " ", text: x[i++] });
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ op: "-", text: x[i++] });
    } else {
      out.push({ op: "+", text: y[j++] });
    }
  }
  while (i < x.length) out.push({ op: "-", text: x[i++] });
  while (j < y.length) out.push({ op: "+", text: y[j++] });
  return out;
}
