/** Bentuk minimal yang dibutuhkan, agar bisa diuji tanpa DOM. */
interface Scrollable {
  scrollIntoView?: (opts: ScrollIntoViewOptions) => void;
}
interface Root {
  querySelector: (selector: string) => unknown;
}

/** Gulir stasiun `.gg-stop-current` ke dalam pandangan. Aman bila elemen/API tidak ada; tidak pernah melempar. */
export function scrollCurrentStop(root: Root | null | undefined): void {
  try {
    const el = root?.querySelector(".gg-stop-current") as Scrollable | null | undefined;
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ inline: "nearest", block: "nearest" });
  } catch {
    // lingkungan tanpa layout (test/SSR) atau browser lama: abaikan
  }
}
