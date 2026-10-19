import type { GitEvent } from "../engine/types";

function sentence(e: GitEvent): string {
  switch (e.type) {
    case "repo-dibuat":
      return "Repositori dibuat. Git sekarang siap mencatat riwayat folder ini.";
    case "file-di-stage":
      return `\`${e.file}\` masuk ke staging area dan akan ikut di commit berikutnya.`;
    case "commit-dibuat":
      return e.parents.length === 0
        ? `Commit pertama \`${e.id}\` dibuat dari isi staging. Belum ada parent.`
        : `Commit \`${e.id}\` dibuat dengan parent \`${e.parents[0]}\`, dan pointer branch bergeser ke sana.`;
    case "branch-dibuat":
      return `Label branch \`${e.name}\` ditempel di commit \`${e.at}\`. Tidak ada file yang disalin.`;
    case "branch-dihapus":
      return `Label branch \`${e.name}\` dilepas. Commit-nya tetap ada.`;
    case "branch-pindah":
      return `HEAD pindah dari \`${e.from}\` ke \`${e.to}\`, dan isi working directory disesuaikan.`;
    case "head-pindah":
      return `HEAD sekarang menunjuk langsung ke commit \`${e.id}\` (detached HEAD), bukan ke branch.`;
    case "merge-fast-forward":
      return `Pointer \`${e.branch}\` maju ke commit \`${e.to}\`. Tidak ada commit baru yang dibuat.`;
    case "merge-commit-dibuat":
      return `Merge commit \`${e.id}\` dibuat dengan dua parent: \`${e.parents[0]}\` dan \`${e.parents[1]}\`.`;
    case "konflik-terjadi":
      return `Konflik di ${e.files.map((f) => `\`${f}\``).join(", ")}: kedua branch mengubahnya berbeda. Pilih isi yang benar.`;
    case "konflik-selesai":
      return "Konflik selesai. Merge commit menyatukan kedua cabang.";
  }
}

/** Satu kalimat penjelasan untuk hasil satu perintah. */
export function describeEvents(events: GitEvent[]): string {
  if (events.length === 0) return "";
  const staged = events.filter((e) => e.type === "file-di-stage");
  if (staged.length === events.length && staged.length > 1) {
    const names = staged.map((e) => (e.type === "file-di-stage" ? `\`${e.file}\`` : "")).join(", ");
    return `${names} masuk ke staging area dan akan ikut di commit berikutnya.`;
  }
  const merge = events.find((e) => e.type === "merge-commit-dibuat");
  return sentence(merge ?? events[events.length - 1]);
}
