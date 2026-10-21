import { headSnapshot } from "../engine/state";
import { cmd, commitCount, setup, write } from "./solve";
import type { Level } from "./types";

const INITIAL = setup({ "style.css": "body { color: #222; }", "notes.md": "# Notes" }, [
  cmd("git init"),
  cmd("git add ."),
  cmd('git commit -m "Initial commit"'),
  write("style.css", "body { color: #222; }\n* { display: none; }"),
  write("notes.md", "# Notes\n- ask about deploy"),
]);
const INITIAL_COMMITS = commitCount(INITIAL);

export const level07: Level = {
  id: 7,
  title: { id: "Membuang perubahan", en: "Discarding changes" },
  story: {
    id: "Eksperimen CSS-mu kebablasan: sekarang seluruh halaman hilang. `git restore <file>` membuang perubahan yang belum di-stage dan mengembalikan file ke versi terakhir yang tersimpan. Hati-hati, perubahan yang dibuang tidak bisa dikembalikan.",
    en: "Your CSS experiment went too far: now the whole page is gone. `git restore <file>` throws away unstaged changes and puts the file back to its last saved version. Careful: discarded changes cannot be brought back.",
  },
  goal: {
    id: "Kembalikan style.css seperti semula, tapi catatan baru di notes.md harus tetap ada.",
    en: "Put style.css back the way it was, but keep the new note in notes.md.",
  },
  editor: false,
  allowedCommands: ["init", "status", "add", "commit", "log", "diff", "restore"],
  initialState: INITIAL,
  hints: [
    {
      id: "Lihat dulu baris apa saja yang berubah di tiap file, supaya kamu yakin mana yang mau dibuang.",
      en: "First look at which lines changed in each file, so you are sure which one to throw away.",
    },
    {
      id: "Membuang perubahan di semua file sekaligus akan ikut menghapus catatanmu. Sebutkan satu file saja.",
      en: "Discarding changes in every file at once would also erase your note. Name just one file.",
    },
    {
      id: "Perintahnya ada di cerita; argumennya adalah nama file CSS yang rusak.",
      en: "The command is in the story; its argument is the name of the broken CSS file.",
    },
  ],
  isGoalReached: (s) => {
    const head = headSnapshot(s);
    return (
      commitCount(s) === INITIAL_COMMITS &&
      s.files["style.css"] === head["style.css"] &&
      s.index["style.css"] === head["style.css"] &&
      s.files["notes.md"] !== head["notes.md"]
    );
  },
  mustRun: ["restore"],
  solution: [cmd("git restore style.css")],
};
