/** Mengubah teks berpenanda `kode` menjadi elemen <code>. */
export function RichText({ text }: { text: string }) {
  return <>{text.split("`").map((p, i) => (i % 2 === 1 ? <code key={i}>{p}</code> : p))}</>;
}
