import type { Localized } from "./types";

/** Jalur belajar: level dikelompokkan menurut tingkat kesulitan. `lane` memilih warna jalur (--lane-N). */
export interface Tier {
  id: string;
  name: Localized;
  what: Localized;
  sub: Localized;
  /** Id level pertama dan terakhir (inklusif). */
  from: number;
  to: number;
  lane: number;
}

export const TIERS: Tier[] = [
  {
    id: "beginner",
    name: { id: "Pemula", en: "Beginner" },
    what: { id: "Simpan dan baca riwayat", en: "Save and read history" },
    sub: { id: "Satu repositori, satu jalur lurus.", en: "One repository, one straight line." },
    from: 1,
    to: 5,
    lane: 0,
  },
  {
    id: "intermediate",
    name: { id: "Menengah", en: "Intermediate" },
    what: { id: "Bekerja dengan branch", en: "Working with branches" },
    sub: { id: "Bercabang, menggabung, dan menyelesaikan konflik.", en: "Branch, merge, and resolve conflicts." },
    from: 6,
    to: 10,
    lane: 1,
  },
  {
    id: "advanced",
    name: { id: "Lanjutan", en: "Advanced" },
    what: { id: "Memperbaiki kesalahan", en: "Fixing mistakes" },
    sub: { id: "Membatalkan commit dengan aman.", en: "Undo commits safely." },
    from: 11,
    to: 13,
    lane: 2,
  },
  {
    id: "expert",
    name: { id: "Mahir", en: "Expert" },
    what: { id: "Merapikan riwayat", en: "Tidying history" },
    sub: { id: "Stash, cherry-pick, dan rebase.", en: "Stash, cherry-pick, and rebase." },
    from: 14,
    to: 17,
    lane: 3,
  },
  {
    id: "teamwork",
    name: { id: "Kolaborasi", en: "Teamwork" },
    what: { id: "Bekerja dengan remote", en: "Working with a remote" },
    sub: { id: "Clone, push, pull, dan menangani penolakan.", en: "Clone, push, pull, and handle a rejection." },
    from: 18,
    to: 21,
    lane: 4,
  },
];

export function tierOf(levelId: number): Tier | undefined {
  return TIERS.find((t) => levelId >= t.from && levelId <= t.to);
}
