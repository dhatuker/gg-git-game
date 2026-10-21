# Git v2C (perintah harian) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah `git diff`, `git restore`, `git commit --amend`, dan jalur "Periksa & rapikan" (level 6–9), sambil menggeser level lama 6–21 ke 10–25 dengan migrasi progres.

**Architecture:** Perintah baru mengikuti pola handler engine yang ada (`(state, args) -> CommandResult`, pesan berkunci + baris raw). Diff per baris ada di modul murni `engine/linediff.ts`; baris raw boleh membawa gaya untuk diwarnai terminal. Level baru disisipkan setelah level lama digeser dalam commit rename tersendiri; progres lama dipetakan sekali ke kunci storage baru.

**Tech Stack:** Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript, Vitest 4. Jalankan test dengan `npx vitest run <path>`.

**Spec:** `docs/superpowers/specs/2026-10-21-git-v2c-daily-design.md`

## Global Constraints

- Semua teks pemain dalam dua bahasa: kunci baru masuk ke `i18n/id/*.ts` dan `i18n/en/*.ts` dengan parameter yang sama (dites oleh `i18n/__tests__/dictionary.test.ts`). Perintah dan nama file ditulis dalam backtick.
- Kunci pesan engine baru harus ditambahkan ke union `MessageKey` (`engine/messages.ts`); kunci UI ke union `UiKey` (`i18n/types.ts`).
- Handler tidak melempar exception; kegagalan memakai `failure(state, msg(...), "<pesan asli git>")` dan mengembalikan state awal tanpa perubahan.
- Petunjuk level: tepat 3, dari samar ke spesifik, tidak memuat perintah solusi utuh (dites `solvable.test.ts`).
- Commit tanpa baris `Co-Authored-By`; akhiri pesan commit dengan `Claude-Session: https://claude.ai/code/session_01UmZaqXj7e6KFoLRTZLoKbf`.
- Kunci storage: `gg-git-game:completed` (v1, dibiarkan) dan `gg-git-game:completed-v2` (baru).
- Peta migrasi: `n ≤ 5 → n`, `6 ≤ n ≤ 21 → n + 4`; nilai lain dibuang.
- `home.linesTitle`: "Enam jalur, dari dasar sampai kerja tim" / "Six paths, from the basics to teamwork".
- `log --graph` tetap ditolak (`flag.unsupported`).

## Review Focus

- Amend setelah push: commit lama masih ditunjuk `origin/main`, jadi tidak boleh digambar pudar, dan `git push` berikutnya ditolak dengan pesan penolakan yang ada → test di Task 4.
- `git diff` saat merge konflik: file berpenanda `<<<<<<<` tampil sebagai diff biasa, tanpa crash dan tanpa mengubah state → test di Task 2.
- `git restore .` saat tidak ada yang berbeda → sukses dengan `restore.nothing`, bukan error → test di Task 3.
- `git restore --staged` di repo tanpa commit: file keluar dari index dan kembali tak terlacak → test di Task 3.
- Storage v2 yang rusak tidak boleh ditimpa ulang dari v1 setiap kali dibaca (migrasi hanya bila v2 belum ada sama sekali) → test di Task 6.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `engine/linediff.ts` (baru) | Diff per baris (LCS), tanpa ketergantungan engine lain |
| `engine/commands/diff.ts` (baru) | Perintah `git diff` |
| `engine/commands/restore.ts` (baru) | Perintah `git restore` |
| `engine/commands/commit.ts` | Cabang `--amend` |
| `engine/messages.ts` | `RawStyle`, `raw(text, style?)`, kunci baru |
| `engine/flags.ts`, `engine/index.ts`, `engine/suggest.ts`, `engine/types.ts` | Opsi, registrasi, saran typo, event baru |
| `ui/Terminal.tsx`, `app/globals.css` | Pewarnaan baris raw bergaya, warna `--lane-5` |
| `ui/highlight.ts`, `ui/AreaPanel.tsx`, `ui/caption.ts` | Sorotan banyak kolom dan caption event baru |
| `ui/progress.ts` | Migrasi v1→v2 |
| `levels/level-06.ts` … `level-09.ts` (baru), `level-10.ts` … `level-25.ts` (rename) | Level |
| `levels/tiers.ts`, `levels/summaries.ts`, `levels/index.ts` | Jalur, ringkasan, catatan perintah, urutan |

---

### Task 1: Diff per baris dan baris raw bergaya

**Files:**
- Create: `engine/linediff.ts`, `engine/__tests__/linediff.test.ts`
- Modify: `engine/messages.ts` (`raw`, `OutputLine`), `i18n/types.ts` (`TLine`), `ui/Terminal.tsx`, `app/globals.css`

**Interfaces:**
- Produces: `export type DiffOp = " " | "-" | "+"; export interface DiffLine { op: DiffOp; text: string }; export function diffLines(a: string, b: string): DiffLine[]`
- Produces: `export type RawStyle = "add" | "del" | "meta"; export function raw(text: string, style?: RawStyle): { raw: string; style?: RawStyle }` (properti `style` hanya ada bila diberikan, agar `toEqual` test lama tetap lolos). `OutputLine` dan `TLine` menjadi `Msg | { raw: string; style?: RawStyle }`.

- [ ] **Step 1: Tulis test `linediff.test.ts`**

```ts
expect(diffLines("a\nb", "a\nb")).toEqual([{ op: " ", text: "a" }, { op: " ", text: "b" }]);
expect(diffLines("", "x\ny")).toEqual([{ op: "+", text: "x" }, { op: "+", text: "y" }]);
expect(diffLines("x", "")).toEqual([{ op: "-", text: "x" }]);
expect(diffLines("", "")).toEqual([]);
expect(diffLines("a\nb\nc", "a\nB\nc")).toEqual([
  { op: " ", text: "a" }, { op: "-", text: "b" }, { op: "+", text: "B" }, { op: " ", text: "c" },
]);
expect(diffLines("a\nc", "a\nb\nc").map((l) => l.op)).toEqual([" ", "+", " "]);
```
Plus di `engine/__tests__/parse.test.ts` atau test baru kecil: `raw("x")` sama dengan `{ raw: "x" }` dan `raw("x", "add")` sama dengan `{ raw: "x", style: "add" }`.

- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/linediff.test.ts` → FAIL (modul belum ada).

- [ ] **Step 3: Implementasi.** `""` = nol baris, selain itu `split("\n")`. Tabel LCS biasa; saat menelusur balik, bila baris berbeda keluarkan `-` sebelum `+` (seperti git). Ubah `raw` dan tipe di `messages.ts`/`i18n/types.ts`.

- [ ] **Step 4: Terminal.** Di `ui/Terminal.tsx`, baris output/error dirender per `TLine` sebagai `<span>` per baris (dipisah `"\n"` seperti sekarang). Baris raw dengan `style` mendapat kelas `gg-term-add` / `gg-term-del` / `gg-term-meta`. Di `app/globals.css` tambah token `--term-add`, `--term-del` di `:root` (dan blok gelap yang ada), plus `.gg-term-meta { color: var(--term-muted) }`.

- [ ] **Step 5: Jalankan** `npx vitest run` → semua PASS; `npx tsc --noEmit` bersih.

- [ ] **Step 6: Commit** `feat: add line diff and styled raw terminal lines`.

---

### Task 2: `git diff`

**Files:**
- Create: `engine/commands/diff.ts`, `engine/__tests__/diff.test.ts`
- Modify: `engine/index.ts` (`HANDLERS.diff`), `engine/suggest.ts` (`KNOWN_COMMANDS`), `engine/flags.ts` (`diff: { flags: ["--staged", "--cached"] }`), `engine/types.ts` (event), `engine/messages.ts`, `i18n/id/engine.ts`, `i18n/en/engine.ts`, `levels/summaries.ts` (`COMMAND_NOTES.diff`)

**Interfaces:**
- Consumes: `diffLines`, `raw(text, style)` dari Task 1.
- Produces: `export const diff: Handler`; event `{ type: "diff-ditampilkan"; staged: boolean }`; kunci `diff.unstaged`, `diff.staged`, `diff.noneUnstaged`, `diff.noneUnstagedButStaged`, `diff.noneStaged`, `diff.untracked` (param `file`), `diff.unknownPath` (param `file`).

- [ ] **Step 1: Tulis `diff.test.ts`** (pakai `initRepo`, `run`, `write`, `exec`, `keys`, `rawText` dari `helpers.ts`). Repo dasar: `app.js = "a\nb"` di-commit.
  - `git diff` setelah `write app.js "a\nB"` → `ok`, `keys = ["diff.unstaged"]`, `rawText` = `diff --git a/app.js b/app.js\n--- a/app.js\n+++ b/app.js\n@@ -1,2 +1,2 @@\n a\n-b\n+B`; gaya: baris `diff --git`/`---`/`+++`/`@@` = `meta`, `-b` = `del`, `+B` = `add`, ` a` tanpa gaya; `r.state` `toBe` state awal; `events = [{ type: "diff-ditampilkan", staged: false }]`.
  - Setelah `git add app.js`: `git diff` → `keys = ["diff.noneUnstagedButStaged"]`, tanpa raw; `git diff --staged` dan `git diff --cached` → `diff.staged` dengan diff yang sama, event `staged: true`.
  - File baru `new.txt = "x"` di-stage, `git diff --staged` → memuat `new file mode 100644`, `--- /dev/null`, `+++ b/new.txt`, `@@ -0,0 +1,1 @@`, `+x`.
  - Repo bersih → `git diff` = `["diff.noneUnstaged"]`, `git diff --staged` = `["diff.noneStaged"]`.
  - Repo tanpa commit dengan file di-stage → `git diff --staged` menampilkan file baru.
  - Filter: dua file berubah, `git diff app.js` hanya memuat `app.js`.
  - `git diff new.txt` untuk file tak terlacak → `ok`, `keys = ["diff.untracked"]`.
  - `git diff nope.txt` → gagal, `keys = ["diff.unknownPath"]`, raw `fatal: ambiguous argument 'nope.txt': unknown revision or path not in the working tree.`
  - Review Focus: repo dalam merge konflik (pola `conflicted()` di `flags.test.ts`) → `git diff` `ok`, raw memuat `+<<<<<<< HEAD`, state `toBe` awal.
  - `git log --graph` → `flag.unsupported` (tetap).

- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/diff.test.ts` → FAIL.

- [ ] **Step 3: Implementasi** `diff.ts`. Kiri/kanan: tanpa opsi `index`→`files` untuk path di `index`; `--staged` `headSnapshot`→`index` untuk path di keduanya. Path yang ikut = yang isinya berbeda, urut nama, dibatasi argumen file bila ada. Hunk: `@@ -${old ? 1 : 0},${oldCount} +${new ? 1 : 0},${newCount} @@`. Tidak memanggil `inProgressBlock`.

- [ ] **Step 4: Teks.** Kunci di kedua bahasa; `diff.noneUnstagedButStaged` menyebut `git diff --staged`; `diff.untracked` menyarankan `git add` lalu `git diff --staged`. `COMMAND_NOTES.diff`: "Menampilkan baris yang berubah dan belum di-commit." / "Shows the lines that changed and are not committed yet."

- [ ] **Step 5: Jalankan** `npx vitest run` → PASS (termasuk `flags.test.ts`, `dictionary.test.ts`).

- [ ] **Step 6: Commit** `feat: add git diff and git diff --staged`.

---

### Task 3: `git restore`

**Files:**
- Create: `engine/commands/restore.ts`, `engine/__tests__/restore.test.ts`
- Modify: `engine/index.ts`, `engine/suggest.ts`, `engine/flags.ts` (`restore: { flags: ["--staged"] }`), `engine/types.ts`, `engine/messages.ts`, `i18n/*/engine.ts`, `levels/summaries.ts` (`COMMAND_NOTES.restore`)

**Interfaces:**
- Produces: `export const restore: Handler`; event `{ type: "restore-dilakukan"; files: string[]; staged: boolean }`; kunci `restore.needPath`, `restore.unknownPath` (param `file`), `restore.nothing`, `restore.done` (param `files`), `restore.unstaged` (param `files`). `files` = nama dipisah `", "`.

- [ ] **Step 1: Tulis `restore.test.ts`.** Repo: `a.txt = "a1"`, `b.txt = "b1"` di-commit.
  - `write a.txt "a2"`, `write b.txt "b2"`, `git restore a.txt` → `files["a.txt"] === "a1"`, `files["b.txt"] === "b2"`, index tak berubah, `keys = ["restore.done"]`, event `{ files: ["a.txt"], staged: false }`.
  - `git restore .` → keduanya kembali; event `files: ["a.txt", "b.txt"]`.
  - `write a.txt "a2"`, `git add a.txt`, `git restore --staged a.txt` → `index["a.txt"] === "a1"`, `files["a.txt"] === "a2"`, `keys = ["restore.unstaged"]`.
  - File baru `c.txt` di-stage, `git restore --staged c.txt` → `"c.txt" in index` false, `files["c.txt"]` tetap.
  - Review Focus: repo tanpa commit (`initRepo({ "x.txt": "1" })`, `git add x.txt`), `git restore --staged x.txt` → index kosong, file tetap.
  - `git restore c.txt` untuk file tak terlacak → gagal, `keys = ["restore.unknownPath"]`, raw `error: pathspec 'c.txt' did not match any file(s) known to git`, state `toBe` awal.
  - Semua-atau-tidak: `write a.txt "a2"`, `git restore a.txt nope` → gagal, `files["a.txt"] === "a2"`.
  - Review Focus: repo bersih, `git restore .` → `ok`, `keys = ["restore.nothing"]`, `events = []`.
  - `git restore` tanpa path → `["restore.needPath"]`.
  - Saat merge konflik → `["merge.inProgress"]`; saat rebase berjalan → `["rebase.inProgress"]`.

- [ ] **Step 2: Jalankan** → FAIL.

- [ ] **Step 3: Implementasi** `restore.ts` sesuai spec §3.3; validasi semua path dulu, baru ubah state. `.` memilih path yang berbeda saja.

- [ ] **Step 4: Teks.** `COMMAND_NOTES.restore`: "Membuang perubahan file, atau mengeluarkannya dari staging dengan --staged." / "Discards changes to a file, or takes it out of staging with --staged."

- [ ] **Step 5: Jalankan** `npx vitest run` → PASS.

- [ ] **Step 6: Commit** `feat: add git restore and git restore --staged`.

---

### Task 4: `git commit --amend`

**Files:**
- Create: `engine/__tests__/amend.test.ts`
- Modify: `engine/commands/commit.ts`, `engine/flags.ts` (`commit: { flags: ["-m", "-a", "--amend", "--no-edit"], value: ["-m"] }`), `engine/types.ts`, `engine/messages.ts`, `i18n/*/engine.ts`, `engine/__tests__/flags.test.ts` (ekspektasi opsi `commit` di test "menyebut opsi yang tersedia" bila ada; `--amend` bukan lagi contoh opsi tak didukung — ganti dengan `--fixup`)

**Interfaces:**
- Consumes: `createCommit(state, message, parents)`, `hasFlag`, `flagValue`, `stageTracked` (sudah ada di `commit.ts`).
- Produces: event `{ type: "commit-diperbaiki"; from: string; to: string }`; kunci `commit.amendNothing`, `commit.amendNeedsMessage`, `commit.amended` (param `from`, `to`).

- [ ] **Step 1: Tulis `amend.test.ts`.** Repo: commit "first" lalu commit "secnod" (mengubah `a.txt`).
  - `git commit --amend -m "second"` → HEAD baru berpesan `second`, parent = id "first", snapshot = snapshot lama, `keys` diawali `commit.amended`, raw `[main <id>] second`, event terakhir `{ type: "commit-diperbaiki", from: <lama>, to: <baru> }`, `unreachableCommits(state)` memuat id lama.
  - `--amend --no-edit` setelah `write b.txt` + `git add b.txt` → pesan tetap `secnod`, snapshot memuat `b.txt`.
  - `--no-edit` tanpa perubahan → tetap ok, id baru ≠ id lama.
  - `git commit --amend` saja → `["commit.amendNeedsMessage"]`, state `toBe` awal.
  - Repo tanpa commit → `["commit.amendNothing"]`, raw `fatal: You have nothing to amend.`
  - `-a --amend -m "x"` dengan `a.txt` diubah di working → snapshot baru memuat isi working; event `file-di-stage` sebelum `commit-diperbaiki`.
  - Merge commit (hasil `git merge` non-ff) di-amend → `parents.length === 2`.
  - HEAD terlepas (`git switch <id first>` lalu commit lalu amend) → `head.type === "detached"` dan menunjuk commit baru.
  - Saat merge konflik → `["merge.inProgress"]`; saat rebase → `["rebase.inProgress"]`.
  - Review Focus: `attachRemote(state)` (helper) lalu amend → id lama tidak ada di `unreachableCommits`; `git push` sesudahnya gagal dengan kunci penolakan non-fast-forward yang dipakai `fetch-push.test.ts`.

- [ ] **Step 2: Jalankan** → FAIL.

- [ ] **Step 3: Implementasi.** Di handler `commit`, setelah blok rebase: bila `hasFlag(args, "--amend", ["-m"])` → cabang amend (cek `mergeState` via `inProgressBlock`, cek commit HEAD ada, pesan dari `-m` atau `--no-edit`, `-a` → `stageTracked`, `createCommit(state, message, headCommit.parents)`). Di luar amend, `--no-edit` diabaikan.

- [ ] **Step 4: Jalankan** `npx vitest run` → PASS.

- [ ] **Step 5: Commit** `feat: add git commit --amend`.

---

### Task 5: Sorotan, caption, dan teks bantuan untuk event baru

**Files:**
- Modify: `ui/highlight.ts`, `ui/AreaPanel.tsx`, `ui/caption.ts`, `i18n/types.ts`, `i18n/*/ui.ts`, `ui/__tests__/highlight.test.ts`, `ui/__tests__/caption.test.ts`

**Interfaces:**
- Consumes: tiga event dari Task 2–4.
- Produces: `export function litColumns(e: GitEvent | null): AreaColumn[]` (menggantikan `litColumn`; event lama → array berisi satu kolom atau kosong). Kunci `caption.diff`, `caption.diffStaged`, `caption.restore` (param `files`), `caption.restoreStaged` (param `files`), `caption.amend` (param `from`, `to`).

- [ ] **Step 1: Test.**
  - `litColumns({ type: "diff-ditampilkan", staged: false })` = `["working", "staging"]`; `staged: true` = `["staging", "repo"]`; `restore-dilakukan` `staged: false` = `["working"]`, `true` = `["staging"]`; `file-di-stage` = `["staging"]`; `null` = `[]`.
  - `highlightTargets`: `restore-dilakukan` → `files` = `e.files`; `commit-diperbaiki` → `commits: [e.to], labels: ["HEAD"]`.
  - `caption.test.ts`: tiga event baru di daftar `all`; `describeEvents([{ type: "diff-ditampilkan", staged: true }])` = `{ key: "caption.diffStaged" }`; untuk `-a --amend`, `describeEvents([file-di-stage, commit-diperbaiki])` menghasilkan `caption.amend` (tambahkan `commit-diperbaiki` ke daftar `priority`).

- [ ] **Step 2: Jalankan** `npx vitest run ui` → FAIL.

- [ ] **Step 3: Implementasi.** `AreaPanel` memakai `litColumns(activeEvent).includes(key)`. Caption `caption.amend` menyebut bahwa commit lama `{from}` masih ada dan digambar pudar. Ganti teks `home.linesTitle` sesuai Global Constraints.

- [ ] **Step 4: Jalankan** `npx vitest run` → PASS; `npx tsc --noEmit` bersih.

- [ ] **Step 5: Commit** `feat: highlight and captions for diff, restore, and amend`.

---

### Task 6: Migrasi progres v1 → v2

**Files:**
- Modify: `ui/progress.ts`, `ui/__tests__/progress.test.ts`

**Interfaces:**
- Produces: `export const KEY_V1 = "gg-git-game:completed"`, `export const KEY_V2 = "gg-git-game:completed-v2"`, `export function migrateCompletedV1(ids: number[]): number[]`, `export function ensureMigrated(storage?: Pick<Storage, "getItem" | "setItem">): void`. `loadCompleted(storage?: Pick<Storage, "getItem" | "setItem">)` memanggil `ensureMigrated` lalu membaca `KEY_V2`; `progressSnapshot()` juga; `saveCompleted` menulis `KEY_V2`.

- [ ] **Step 1: Test** dengan stub storage berbasis `Map` (kunci-sadar):
  - `migrateCompletedV1([1, 5, 6, 21, 22, 0, 6])` = `[1, 5, 10, 25]`.
  - v1 = `[1,2,3,4,5,6,7]`, v2 kosong → `loadCompleted` = `[1,2,3,4,5,10,11]`, v2 tertulis, v1 tidak berubah.
  - Idempoten: panggil `loadCompleted` dua kali → hasil sama, `setItem` hanya dipanggil sekali.
  - v2 = `[1,2]` sudah ada, v1 = `[1..21]` → `[1,2]` (tidak ditimpa).
  - Review Focus: v2 = `"{rusak"`, v1 = `[1,2,3]` → `loadCompleted` = `[]` dan v2 tidak ditulis ulang.
  - v1 rusak, v2 kosong → `[]`.
  - Storage yang melempar → `[]` tanpa exception (test lama tetap).
  - `saveCompleted([3])` menulis ke `KEY_V2`.
  - Sesuaikan test lama yang memakai `stub(value)` agar menyimpan nilai di `KEY_V2`.

- [ ] **Step 2: Jalankan** `npx vitest run ui/__tests__/progress.test.ts` → FAIL.

- [ ] **Step 3: Implementasi** sesuai spec §6.2; v1 dibaca lewat `parseCompleted` yang sudah ada.

- [ ] **Step 4: Jalankan** `npx vitest run` → PASS.

- [ ] **Step 5: Commit** `feat: migrate saved progress to v2 level numbering`.

---

### Task 7: Geser level 6–21 menjadi 10–25

Commit ini hanya rename dan penyesuaian nomor; belum ada konten level baru.

**Files:**
- Rename (`git mv`, dari yang terbesar agar tidak bentrok): `levels/level-21.ts` → `level-25.ts`, … , `level-06.ts` → `level-10.ts`
- Modify: setiap file yang di-rename (`id` dan nama export `levelNN` +4, `allowedCommands` ditambah `"diff", "restore"`), `levels/index.ts`, `levels/tiers.ts`, `levels/summaries.ts` (kunci 6–21 → 10–25), `ui/Game.tsx` (`onNext`), `app/globals.css` (`--lane-5`), test: `levels/__tests__/solvable.test.ts`, `levels/__tests__/level-alt-solutions.test.ts`, `levels/__tests__/tiers.test.ts`, `ui/__tests__/game-state.test.ts`, `ui/__tests__/carry.test.ts` (bila menyebut nomor level)

**Interfaces:**
- Produces: jalur `tidy` di `TIERS` (urutan ke-2): `name { id: "Periksa & rapikan", en: "Check & tidy" }`, `what { id: "Merapikan sebelum dan sesudah commit", en: "Tidy up before and after a commit" }`, `sub { id: "Lihat perubahan, buang yang salah, perbaiki commit terakhir.", en: "See changes, discard mistakes, fix the last commit." }`, `from: 6, to: 9, lane: 5`. Rentang lain: intermediate 10–14, advanced 15–17, expert 18–21, teamwork 22–25.

- [ ] **Step 1: Rename dan ubah id**, lalu `grep -rn "level 1[0-9]\|level 2[01]\|level [6-9]" levels` untuk teks yang menyebut nomor level lama dan perbarui bila ada.

- [ ] **Step 2: Sesuaikan test.**
  - `solvable.test.ts`: id = `[1..5, 10..25]` sementara (Task 8 mengubahnya ke `1..25`).
  - `tiers.test.ts`: `TIERS.at(-1)?.to` dibandingkan dengan `LEVELS.at(-1)?.id`; lane `< 6`; `tierOf(6)?.id === "tidy"`; `tierOf(10)?.id === "intermediate"`.
  - `level-alt-solutions.test.ts`: `level(id)` menjadi pencarian berdasarkan id (`LEVELS.find((l) => l.id === id)!`), dan semua nomor +4 untuk level ≥ 6.
  - `game-state.test.ts`: daftar `completed` yang memuat nomor ≥ 6 digeser +4 (indeks `levelIndex` tidak berubah di commit ini).

- [ ] **Step 3: `ui/Game.tsx`** `onNext` memakai `LEVELS[state.levelIndex + 1].id`, bukan `level.id + 1`.

- [ ] **Step 4: `globals.css`** tambah `--lane-5` (terang `#0e7f8c`, gelap `#3cc2cf`) di kedua blok token.

- [ ] **Step 5: Jalankan** `npx vitest run` dan `npx tsc --noEmit` → PASS / bersih.

- [ ] **Step 6: Commit** `refactor: renumber levels 6-21 to 10-25 for the new tidy path`.

---

### Task 8: Level 6–9

**Files:**
- Create: `levels/level-06.ts` … `levels/level-09.ts`
- Modify: `levels/index.ts`, `levels/summaries.ts` (`SUMMARIES[6..9]`), `levels/__tests__/solvable.test.ts` (id `1..25`), `levels/__tests__/level-alt-solutions.test.ts`, `ui/__tests__/game-state.test.ts` (indeks `atLevel(...)` dan `initGame([...])` yang terdampak sisipan: indeks ≥ 5 bergeser +4)

**Interfaces:**
- Consumes: `setup`, `cmd`, `write`, `headParents`, `commitCount` (`levels/solve.ts`); `getHeadCommitId`, `headSnapshot` (`engine/state.ts`).
- Produces: `level06` … `level09` (`Level`), `editor: false`. `allowedCommands`: level 6 = `["init", "status", "add", "commit", "log", "diff"]`; level 7–9 = level 6 + `"restore"`.

Keadaan awal dan solusi (isi file tepat):

| Level | Setup (`setup(files, steps)`) | Tujuan | `mustRun` | `solution` |
|---|---|---|---|---|
| 6 | `README.md "# Greeter"`, `app.js "export function greet(name) {\n  return 'Hi ' + name;\n}"`, `config.js "export const debug = false;"`; `git init`, `git add .`, `git commit -m "Initial commit"`; lalu `write app.js` + baris `"\nexport function bye(name) {\n  return 'Bye ' + name;\n}"` dan `write config.js "export const debug = true;"` | parent HEAD = commit awal; `app.js` di snapshot HEAD = versi baru; `config.js` = versi lama | `["diff"]` | `git diff`, `git add app.js`, `git commit -m "Add bye function"` |
| 7 | `style.css "body { color: #222; }"`, `notes.md "# Notes"` di-commit; lalu `write style.css "body { color: #222; }\n* { display: none; }"`, `write notes.md "# Notes\n- ask about deploy"` | `files` dan `index` `style.css` = HEAD; `files["notes.md"]` ≠ HEAD; jumlah commit tetap | `["restore"]` | `git restore style.css` |
| 8 | `app.js "console.log('v1');"` di-commit; lalu `write app.js "console.log('v2');"`, `write .env "DB_PASSWORD=hunter2"`, `git add .` | parent HEAD = commit awal; snapshot HEAD `app.js` = v2 dan tanpa `.env`; `".env" in files` | `["diff", "restore"]` | `git diff --staged`, `git restore --staged .env`, `git commit -m "Update app log"` |
| 9 | `index.html "<h1>Home</h1>"` di-commit ("Initial commit"); lalu `write login.html "<form></form>"`, `write login.css "form { margin: auto; }"`, `git add login.html`, `git commit -m "Add lgoin page"` | parent HEAD = [id "Initial commit"]; snapshot HEAD memuat `login.css`; pesan HEAD ≠ `Add lgoin page` | — | `git add login.css`, `git commit --amend -m "Add login page"` |

Cerita level menyebut nama perintah baru (seperti level 1–5); petunjuk tidak. Simpan id commit awal di konstanta modul (`getHeadCommitId(initialStateSebelumPerubahan)`) untuk pemeriksaan parent.

- [ ] **Step 1: Test alternatif dan negatif** di `level-alt-solutions.test.ts`:
  - L6: `git diff config.js`, `git add app.js`, `git commit -m "x"` → tercapai; `git add .` + commit → tidak tercapai.
  - L7: `git restore .` → tidak tercapai (notes ikut hilang); `git restore style.css` → tercapai.
  - L8: `git restore --staged .env`, `git commit -am "x"` → tercapai; `git commit -m "x"` langsung → tidak tercapai.
  - L9: `git add .`, `git commit --amend --no-edit` → tidak tercapai (pesan sama); `git add login.css`, `git commit -m "Add login css"` → tidak tercapai (parent berbeda).

- [ ] **Step 2: Jalankan** `npx vitest run levels` → FAIL (level belum ada).

- [ ] **Step 3: Tulis keempat level dan `SUMMARIES[6..9]`**, daftarkan di `levels/index.ts`, ubah ekspektasi id di `solvable.test.ts` menjadi `1..25`, geser indeks di `game-state.test.ts`.

- [ ] **Step 4: Jalankan** `npx vitest run`, `npx eslint .`, `npx tsc --noEmit` → PASS / bersih.

- [ ] **Step 5: Commit** `feat: add tidy path levels 6-9 (diff, restore, amend)`.

---

### Task 9: Verifikasi akhir dan rilis

- [ ] **Step 1:** `npx vitest run`, `npx eslint .`, `npx next build` → semua lolos.
- [ ] **Step 2:** `npx next start -p 3125`, lalu dengan Playwright (Chromium di `/opt/pw-browsers/chromium`): mainkan level 6–9 sampai modal rangkuman muncul (desktop 1440×900 dan HP 390×844); cek warna baris diff, sorotan dua kolom saat `git diff`, `git help` di level 8 memuat `diff` dan `restore` beserta opsinya, peta level menampilkan enam jalur, dan localStorage v1 `[1..21]` termigrasi menjadi 1–5 + 10–25 dengan level 6 sebagai "berikutnya".
- [ ] **Step 3:** `git push origin main`; cek deploy Vercel proyek `gg-git-game` sampai `READY`.
