# Game Belajar Git v2A (perintah lokal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah `reset`, `revert`, `stash`, `cherry-pick`, dan `rebase` (dasar plus konflik) ke mini git engine, visualisasinya, dan level 11–17.

**Architecture:** Engine TypeScript murni diperluas dengan dua field state (`stash`, `rebaseState`), modul bersama `threeway.ts` dan `revision.ts`, serta handler per perintah. Commit yang tidak terjangkau tidak pernah dihapus; graf menggambarnya pudar. Level baru memakai `projectSetup` dan tujuan berbasis state.

**Tech Stack:** Next.js 16.4.2, React 19.3.0, TypeScript, Vitest 4 (`npm test` = `vitest run`).

**Spec:** `docs/superpowers/specs/2026-10-20-git-v2a-local-design.md` (turunan dari `2026-10-19-git-learning-game-design.md`)

## Global Constraints

- `engine/` dan `levels/` tidak boleh mengimpor apa pun dari `next` atau `react`. Engine tidak pernah melempar exception ke UI: kegagalan dikembalikan lewat `failure(...)` dengan `ok: false` dan state tidak berubah.
- Engine tidak pernah menghapus commit dari `state.commits`. `Commit.seq` ikut di-hash sehingga salinan commit selalu berid baru.
- Setiap pesan baru (engine, caption, UI, teks level) wajib ada di `id` dan `en`. `i18n/__tests__/dictionary.test.ts` (kunci sama, parameter `{x}` sama, tidak kosong) harus tetap lolos.
- Format pesan engine: pesan berkunci (`msg(key, params)`) di baris pertama, pesan asli git (`raw`) di bawahnya, lewat `failure(state, msg, gitMessage)`.
- Tiap level: tepat 3 petunjuk bertingkat (`id` dan `en`) yang tidak memuat perintah solusi utuh (dijaga `levels/__tests__/solvable.test.ts`); tujuan dinilai dari state, bukan urutan perintah.
- `AGENTS.md`: versi Next ini berbeda dari yang umum dikenal. Rencana ini tidak menyentuh API Next, tetapi bila ada perubahan di `app/` baca `node_modules/next/dist/docs/` dulu.
- Commit git: pesan singkat gaya `feat:`/`test:`/`refactor:`, **tanpa baris `Co-Authored-By`** (preferensi pengguna, berlaku untuk semua commit di rencana ini).
- Perintah verifikasi: `npx vitest run <path>` untuk satu berkas, `npm test` untuk semua, `npx tsc --noEmit` untuk tipe, `npm run lint`.
- Nama file contoh dalam level memakai nama netral dari `PROJECT_HISTORY` (`index.html`, `style.css`, `app.js`, `login.js`, `README.md`, `CONTRIBUTING.md`); jangan memakai `fitur`, `catatan.txt`, `ide.txt`.

## Review Focus

Kelas input yang tidak tersirat jelas di spec; tiap baris punya tes di task pemilik.

1. `reset --hard` saat ada file tak terlacak: file aman, tetapi bila file tak terlacak akan tertimpa snapshot target, ditolak (Task 5).
2. Revisi di luar jangkauan: `HEAD~99` melewati root, prefix hash ambigu atau terlalu pendek, `HEAD~0`, repo tanpa commit (Task 3, Task 5).
3. Rebase dengan merge commit di rentang yang disalin: ditolak dengan pesan dan state tidak berubah (Task 8).
4. HEAD detached: `reset` menggeser HEAD terlepas, `rebase` ditolak ("bukan di branch"), `stash` tetap jalan (Task 5, 7, 8).
5. `stash pop` setelah pindah branch di mana file yang sama berbeda isinya (ditolak, stash dipertahankan), `stash` hanya dengan file tak terlacak ("tidak ada perubahan"), `stash` sebelum commit pertama (Task 7).

## Pemetaan File

Baru:
- `engine/threeway.ts`: penggabungan per file (dipakai merge, revert, cherry-pick, rebase).
- `engine/revision.ts`: parser revisi.
- `engine/commands/{reset,revert,cherry-pick,stash,rebase}.ts` dan `engine/__tests__/{revision,reset,revert,cherry-pick,stash,rebase,state-helpers,threeway}.test.ts`.
- `levels/level-11.ts` … `levels/level-17.ts`.

Diubah: `engine/types.ts`, `engine/state.ts`, `engine/messages.ts`, `engine/index.ts`, `engine/suggest.ts`, `engine/files.ts`, `engine/commands/{merge,add,status,commit,switch}.ts`, `i18n/types.ts`, `i18n/{id,en}/{engine,ui}.ts`, `ui/{caption,highlight,layout,GitGraph,AreaPanel,Game,FileEditor,LevelMap}.ts(x)`, `app/globals.css`, `levels/{index,solve,types}.ts`, `levels/__tests__/solvable.test.ts`, dan tes UI yang ada (`layout`, `caption`).

---

### Task 1: Fondasi state (field baru dan helper)

**Files:**
- Modify: `engine/types.ts`, `engine/state.ts`, `engine/messages.ts`, `i18n/{id,en}/engine.ts`, `engine/files.ts`, `engine/commands/add.ts`, `engine/commands/status.ts`, `ui/AreaPanel.tsx`, `ui/Game.tsx`, `ui/GitGraph.tsx`
- Test: `engine/__tests__/state-helpers.test.ts`

**Interfaces:**
- Produces (di `engine/types.ts`):
  - `interface StashEntry { files: Files; index: Files; baseCommit: string | null }`
  - `interface RebaseState { branch: string; onto: string; originalTip: string; current: string | null; remaining: string[]; conflicts: string[] }`
  - `RepoState` bertambah `stash: StashEntry[]` dan `rebaseState: RebaseState | null`.
- Produces (di `engine/state.ts`):
  - `activeConflicts(state: RepoState): string[]` (dari `mergeState` atau `rebaseState`, `[]` bila tidak ada)
  - `conflictSources(state: RepoState): { ours: string; theirs: string } | null` (`ours` = id commit HEAD; `theirs` = `mergeState.fromCommit` atau `rebaseState.current`; `null` bila tak ada konflik aktif)
  - `markResolved(state: RepoState, paths: string[]): { state: RepoState; resolved: string[]; remaining: string[] | null }` (membuang `paths` dari daftar konflik state aktif; `remaining` `null` bila tak ada state konflik)
  - `unreachableCommits(state: RepoState): string[]` (id commit yang tak terjangkau dari branch mana pun, HEAD, `mergeState.fromCommit`, `rebaseState.originalTip`, atau `rebaseState.current`; urut `seq` menurun)
  - `inProgressBlock(state: RepoState): CommandResult | null` (`failure` bila `rebaseState` aktif: `msg("rebase.inProgress")` plus git `"fatal: It seems that there is already a rebase-merge directory"`; bila `mergeState` aktif: `msg("merge.inProgress")` plus git `"fatal: You have not concluded your merge (MERGE_HEAD exists)."`; selain itu `null`)
- Kunci pesan baru `rebase.inProgress` dan `add.allConflictsResolvedRebase` (id dan en) di `MessageKey`. Yang kedua dipakai `add` saat semua konflik selesai dan state aktifnya rebase: arahkan pemain ke `git rebase --continue` (yang lama tetap untuk merge).

- [ ] **Step 1: Write the failing test** di `engine/__tests__/state-helpers.test.ts`: (a) `createEmptyRepo()` punya `stash: []` dan `rebaseState: null`; (b) `unreachableCommits` kosong pada riwayat linear, berisi id commit yang ditinggalkan setelah `repo.branches.main` digeser mundur secara manual, dan tidak memuat commit yang masih ditunjuk HEAD detached; (c) `activeConflicts` mengembalikan konflik `mergeState` setelah merge berkonflik (pakai pola `divergedSetup(true)` dari `engine/__tests__/merge.test.ts`) dan `["x.txt"]` untuk `rebaseState` buatan tangan; (d) `markResolved` membuang path yang diberikan dan mengembalikan `remaining: null` tanpa state konflik; (e) `conflictSources` mengembalikan `theirs = rebaseState.current` untuk state rebase buatan tangan; (f) `inProgressBlock` mengembalikan `ok: false` untuk kedua state dan `null` untuk state bersih.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/state-helpers.test.ts`. Expected: FAIL (fungsi belum ada).
- [ ] **Step 3: Implement** field dan helper di atas. `createEmptyRepo` mengisi `stash: []`, `rebaseState: null`. Tambah `rebase.inProgress` ke `MessageKey` dan kedua kamus engine (id: minta pemain menyelesaikan dengan `git rebase --continue` atau membatalkan dengan `git rebase --abort`; en: padanannya).
- [ ] **Step 4: Rewire pemakai konflik** agar membaca helper, tanpa mengubah perilaku merge: `engine/commands/add.ts` memakai `markResolved` (ganti logika `mergeState` inline; pesan `add.conflictResolved`/`add.conflictsRemain` tetap; saat semua konflik selesai tampilkan `add.allConflictsResolved` bila state aktifnya merge, `add.allConflictsResolvedRebase` bila rebase), `status.ts` memakai `activeConflicts`, `engine/files.ts` `resolveConflict` memakai `conflictSources` dan `activeConflicts` (galat `files.notConflicted` bila `file` tak ada di `activeConflicts`), `ui/AreaPanel.tsx` dan `ui/Game.tsx` memakai `activeConflicts(repo)`, `ui/GitGraph.tsx` mengisi `conflictFrom` dari `mergeState?.fromCommit ?? rebaseState?.current ?? null`.
- [ ] **Step 5: Run** `npm test` dan `npx tsc --noEmit`. Expected: seluruh tes lama tetap hijau (periksa tes yang membandingkan state penuh dengan `toEqual`; tambahkan dua field baru bila perlu), tes baru hijau, tanpa error tipe.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: add stash/rebase state fields and conflict helpers"`

---

### Task 2: `threeway.ts` dan refactor merge

**Files:**
- Create: `engine/threeway.ts`
- Modify: `engine/commands/merge.ts`
- Test: `engine/__tests__/threeway.test.ts`

**Interfaces:**
- Produces: `threeWay(base: Files, ours: Files, theirs: Files, label: string): { merged: Files; conflictFiles: Files; conflicts: string[] }`. Aturan per path (urut alfabet) persis seperti di `merge.ts` sekarang: `ours===theirs` → itu; `base===ours` → theirs; `base===theirs` → ours; selain itu konflik. `conflictFiles[p]` = `<<<<<<< HEAD\n{ours}\n=======\n{theirs}\n>>>>>>> {label}`; `merged[p]` berisi versi ours bila ada. Path yang hasilnya `undefined` (dihapus) tidak masuk `merged`.

- [ ] **Step 1: Write the failing test** `threeway.test.ts`: tanpa konflik (perubahan di file berbeda digabung), hanya satu sisi mengubah, kedua sisi mengubah file sama dengan isi sama (bukan konflik), konflik menghasilkan penanda lengkap dengan `label` di baris `>>>>>>>`, file dihapus di satu sisi dan tak berubah di sisi lain (hilang dari `merged`).
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/threeway.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `threeWay` dengan memindahkan loop per file dari `merge.ts`.
- [ ] **Step 4: Refactor `merge.ts`** agar memakai `threeWay(b, o, t, target)`; sisanya tidak berubah.
- [ ] **Step 5: Run** `npx vitest run engine/__tests__/merge.test.ts engine/__tests__/threeway.test.ts` lalu `npm test`. Expected: PASS tanpa mengubah `merge.test.ts`.
- [ ] **Step 6: Commit** `refactor: extract threeWay from merge`

---

### Task 3: `revision.ts`

**Files:**
- Create: `engine/revision.ts`
- Modify: `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/revision.test.ts`

**Interfaces:**
- Produces: `resolveRevision(state: RepoState, text: string): { id: string } | { error: Msg; git: string }`. Bentuk yang dikenal: nama branch, `HEAD`, `HEAD~N` (N bilangan bulat ≥ 0, mengikuti parent pertama), hash penuh atau prefix unik ≥ 4 karakter. Kunci pesan baru: `revision.unknown` (param `rev`), `revision.ambiguous` (param `rev`), `revision.tooFar` (param `rev`), `revision.unsupported` (param `rev`; untuk `HEAD^`, `A..B`, `@`, dan bentuk lain). `git` berisi pesan asli, mis. `fatal: ambiguous argument 'x': unknown revision or path not in the working tree.`

- [ ] **Step 1: Write the failing test** (riwayat linear 4 commit): `HEAD`, `HEAD~0`, `HEAD~2` memberi id yang benar; nama branch; hash penuh; prefix 4 karakter unik; `HEAD~99` → `revision.tooFar`; prefix 3 karakter dan prefix yang cocok >1 commit (buat dengan mencari dua id berawalan sama, atau gunakan state buatan tangan) → `revision.ambiguous`; `HEAD^`, `main..HEAD`, `@` → `revision.unsupported`; teks acak → `revision.unknown`; repo tanpa commit dengan `HEAD` → `revision.unknown`.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/revision.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `resolveRevision`; tambah empat kunci ke `MessageKey` dan kedua kamus.
- [ ] **Step 4: Run** `npx vitest run engine/__tests__/revision.test.ts engine/__tests__/` dan `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add revision parser`

---

### Task 4: Event baru, caption, highlight, kunci UI

**Files:**
- Modify: `engine/types.ts`, `i18n/types.ts`, `i18n/{id,en}/ui.ts`, `ui/caption.ts`, `ui/highlight.ts`
- Test: `ui/__tests__/caption.test.ts` (tambah), tes highlight baru di `ui/__tests__/highlight.test.ts`

**Interfaces:**
- Produces: varian `GitEvent` baru (bentuk persis):
  - `{ type: "reset-dilakukan"; mode: "soft" | "mixed" | "hard"; from: string; to: string }`
  - `{ type: "revert-dibuat"; id: string; reverted: string }`
  - `{ type: "cherry-pick-dibuat"; id: string; source: string }`
  - `{ type: "stash-disimpan"; files: string[] }`
  - `{ type: "stash-dipulihkan"; files: string[] }`
  - `{ type: "rebase-commit-disalin"; from: string; to: string }`
  - `{ type: "rebase-selesai"; branch: string; tip: string }`
  - `{ type: "rebase-dibatalkan"; branch: string }`
- Kunci UI baru (id dan en): `caption.resetSoft`, `caption.resetMixed`, `caption.resetHard` (param `from`, `to`), `caption.revert` (`id`, `reverted`), `caption.cherryPick` (`id`, `source`), `caption.stashSaved` (`files`), `caption.stashRestored` (`files`), `caption.rebaseCopied` (`from`, `to`), `caption.rebaseDone` (`branch`, `tip`), `caption.rebaseAborted` (`branch`).

- [ ] **Step 1: Write the failing test**: `describeEvents([{type:"reset-dilakukan",mode:"hard",from:"a",to:"b"}])` → `{ key: "caption.resetHard", params: { from: "a", to: "b" } }` (dan untuk soft/mixed); `describeEvents([commit-dibuat, revert-dibuat])` memilih `caption.revert`; `[commit-dibuat, cherry-pick-dibuat]` memilih `caption.cherryPick`; `[rebase-commit-disalin, rebase-commit-disalin, rebase-selesai]` memilih `caption.rebaseDone`; `highlightTargets` untuk `reset-dilakukan` → `{ commits: [to], labels: ["HEAD"], files: [] }`, `rebase-commit-disalin` → commit `to`, `rebase-selesai` → commit `tip` dan label `branch`, `stash-disimpan`/`stash-dipulihkan` → `files` dari event, `revert-dibuat` dan `cherry-pick-dibuat` → commit `id`.
- [ ] **Step 2: Run** `npx vitest run ui/__tests__/caption.test.ts ui/__tests__/highlight.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**: tambah varian event; `describe` di `caption.ts` mendapat case baru (switch harus tetap exhaustif); `describeEvents` memberi prioritas `rebase-selesai` > `revert-dibuat` > `cherry-pick-dibuat` > `merge-commit-dibuat` atas event terakhir; `highlightTargets` mendapat case baru; kunci UI dan teks id/en (satu kalimat yang menjelaskan apa yang terjadi di graf, gaya caption yang ada).
- [ ] **Step 4: Run** `npm test` dan `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add v2a git events, captions and highlights`

---

### Task 5: `reset`

**Files:**
- Create: `engine/commands/reset.ts`
- Modify: `engine/index.ts` (daftar `reset` di `HANDLERS`), `engine/suggest.ts` (`KNOWN_COMMANDS`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/reset.test.ts`

**Interfaces:**
- Consumes: `resolveRevision`, `inProgressBlock`, `checkoutSnapshot`, `untrackedOverwritten`, `untrackedFailure` (action `"switch"`), `getHeadCommitId`.
- Produces: `export const reset: Handler`. Sintaks `git reset [--soft|--mixed|--hard] [<rev>]` (default mode `mixed`, default rev `HEAD`; flag boleh sebelum atau sesudah rev; flag tak dikenal → `reset.badFlag` param `flag`). Menggeser pointer branch aktif, atau `head.id` bila detached. `soft`: index dan files tak berubah. `mixed`: `index` = snapshot target, files tak berubah. `hard`: `{files, index}` = `checkoutSnapshot(state, snapshot)`. Event: `[{ type: "reset-dilakukan", mode, from, to }]`; `from` = id HEAD sebelum, `to` = target. Output: pesan berkunci `reset.soft`/`reset.mixed`/`reset.hard` (param `to`) plus `raw("HEAD is now at {to} {pesan}")` untuk hard. Kunci error: `reset.noCommits` (repo tanpa commit), `reset.badFlag`.

- [ ] **Step 1: Write the failing test** (helper dari `engine/__tests__/helpers.ts`; riwayat 3 commit di `main` dengan `app.js` berbeda tiap commit): soft `HEAD~1` memindah `main` dan menjaga index dan files (file ter-stage tetap ter-stage); mixed (dengan dan tanpa flag eksplisit) mengosongkan staging tetapi file kerja utuh; hard `HEAD~2` membuat files dan index sama dengan snapshot target dan menjaga file tak terlacak; commit yang ditinggalkan masih ada di `state.commits` dan muncul di `unreachableCommits`; `git reset --hard` tanpa rev membuang perubahan tak ter-commit; file tak terlacak yang akan tertimpa snapshot target pada hard → `ok: false`, state sama; HEAD detached: reset menggeser `head.id`; ditolak saat `mergeState` aktif (state merge dari pola `divergedSetup`); `HEAD~99` → `ok: false`; repo tanpa commit → `reset.noCommits`; `--bogus` → `reset.badFlag`.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/reset.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `reset`, daftarkan, tambah ke `KNOWN_COMMANDS` (juga `revert`, `stash`, `cherry-pick`, `rebase` sekarang, supaya saran typo konsisten), tambah kunci pesan dan teks id/en.
- [ ] **Step 4: Run** `npx vitest run engine/__tests__/reset.test.ts` lalu `npm test`. Expected: PASS (tes `suggest` yang ada tetap hijau).
- [ ] **Step 5: Commit** `feat: add git reset`

---

### Task 6: `revert` dan `cherry-pick`

**Files:**
- Create: `engine/commands/revert.ts`, `engine/commands/cherry-pick.ts`
- Modify: `engine/index.ts` (`revert`, `cherry-pick`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/revert.test.ts`, `engine/__tests__/cherry-pick.test.ts`

**Interfaces:**
- Consumes: `resolveRevision`, `inProgressBlock`, `threeWay`, `createCommit` (dari `commit.ts`), `hasUncommittedChanges`, `DIRTY_MESSAGE`/`DIRTY_GIT`, `headSnapshot`.
- Produces: `export const revert: Handler` dan `export const cherryPick: Handler` (terdaftar sebagai `"revert"` dan `"cherry-pick"`). Keduanya: butuh tepat satu argumen rev (`revert.needTarget`/`cherryPick.needTarget`), repo punya commit, working tree bersih (`DIRTY_MESSAGE`), commit target bukan merge commit (`revert.isMerge`/`cherryPick.isMerge`), tanpa konflik (bila `threeWay` melaporkan konflik → `revert.conflict`/`cherryPick.conflict` dengan param `files`, state tak berubah).
  - `revert`: `threeWay(base = target.snapshot, ours = HEAD snapshot, theirs = snapshot parent target (atau {} bila root), label)`; commit baru satu parent (HEAD), pesan `Revert "${target.message}"`; files dan index diset ke hasil merge (file tak terlacak dipertahankan seperti `withUntracked` di merge). Event `[commit-dibuat, revert-dibuat{id, reverted}]`.
  - `cherry-pick`: `threeWay(base = snapshot parent commit (atau {}), ours = HEAD snapshot, theirs = commit.snapshot, label)`; pesan sama dengan commit sumber; bila hasil identik dengan snapshot HEAD → `cherryPick.empty` (ok: false, state sama). Event `[commit-dibuat, cherry-pick-dibuat{id, source}]`.
  - Kunci pesan sukses `revert.done` (param `id`, `reverted`) dan `cherryPick.done` (param `id`, `source`).

- [ ] **Step 1: Write the failing test**: revert commit di tengah (file kembali ke isi sebelum commit itu, perubahan commit sesudahnya pada file lain tetap), pesan `Revert "..."`, ujung lama tetap leluhur HEAD (`isReachable`), id berbeda; revert commit pertama (root) menghapus file yang ia buat; revert merge commit → `revert.isMerge`; revert yang bentrok dengan perubahan lanjutan pada baris sama → `revert.conflict`, state identik; working tree kotor → `ok: false`; rev tidak valid → `ok: false`. Cherry-pick satu commit dari branch lain: commit baru satu parent dengan pesan sama dan id berbeda dari sumber, branch sumber tak berubah, hanya perubahan commit itu yang masuk; cherry-pick yang sudah teraplikasi → `cherryPick.empty`; konflik → ditolak, state identik; merge commit ditolak; HEAD detached tetap berjalan (commit baru di `head.id`).
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/revert.test.ts engine/__tests__/cherry-pick.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** keduanya (bagi kode pembentuk hasil merge ke fungsi pembantu lokal bila berulang), daftarkan, tambah kunci pesan dan teks id/en.
- [ ] **Step 4: Run** tes di atas lalu `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add git revert and cherry-pick`

---

### Task 7: `stash`

**Files:**
- Create: `engine/commands/stash.ts`
- Modify: `engine/index.ts` (`stash`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/stash.test.ts`

**Interfaces:**
- Consumes: `inProgressBlock`, `headSnapshot`, `getHeadCommitId`, `checkoutSnapshot`.
- Produces: `export const stash: Handler`. Subperintah `push` (juga bila tanpa argumen), `pop`, `list`; lainnya → `stash.unsupported` (param `sub`).
  - `push`: tidak ada perubahan file terlacak (index dan files sama dengan snapshot HEAD, abaikan file tak terlacak) → `stash.nothing` (ok: false). Selain itu `stash.unshift({ files: tracked working files, index: {...state.index}, baseCommit: getHeadCommitId(state) })` lalu `files`/`index` = snapshot HEAD ditambah file tak terlacak (tanpa commit: kosongkan file terlacak). `stash.push` tanpa commit pertama → `stash.noCommits`. Event `[stash-disimpan{files}]`; `files` = path yang berubah.
  - `pop`: stash kosong → `stash.empty`. Untuk tiap path yang diubah stash, bila working directory sekarang sudah berbeda dari snapshot HEAD pada path itu → `stash.conflict` (param `files`), state dan stash tak berubah. Selain itu terapkan isi file stash ke working directory, index tetap snapshot HEAD (perubahan jadi belum di-stage), buang entri 0. Event `[stash-dipulihkan{files}]`.
  - `list`: baris raw `stash@{i}: WIP on {branch|HEAD}: {baseCommit} {pesan commit}` per entri; kosong → tidak ada keluaran selain `stash.noneYet`.
  - Kunci pesan sukses: `stash.saved` (param `files`), `stash.popped` (param `files`), `stash.noneYet`.

- [ ] **Step 1: Write the failing test**: push menyimpan perubahan tak ter-stage dan ter-stage, mengembalikan working directory dan index ke HEAD, stash.length 1; pop mengembalikan isi file sebagai perubahan tak ter-stage dan mengosongkan stash; dua kali push lalu pop mengambil yang terbaru (urutan LIFO); list memuat `stash@{0}: WIP on main:`; stash tanpa perubahan → `stash.nothing`; hanya file tak terlacak → `stash.nothing`; sebelum commit pertama → `stash.noCommits`; pop kosong → `stash.empty`; pop setelah `switch` ke branch lain di mana file yang sama berbeda dari yang di-stash dan working directory sudah berubah → `stash.conflict`, stash tetap 1; HEAD detached: push berhasil; `apply`/`drop`/`-u` → `stash.unsupported`; ditolak saat rebase/merge aktif.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/stash.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `stash`, daftarkan, tambah kunci pesan dan teks id/en.
- [ ] **Step 4: Run** tes di atas lalu `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add git stash`

---

### Task 8: `rebase <branch>`

**Files:**
- Create: `engine/commands/rebase.ts`
- Modify: `engine/index.ts` (`rebase`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/rebase.test.ts`

**Interfaces:**
- Consumes: `inProgressBlock`, `threeWay`, `createCommit`, `isReachable`, `reachableCommits` (dari `log.ts`), `checkoutSnapshot`, `hasUncommittedChanges`, `DIRTY_MESSAGE`/`DIRTY_GIT`, `activeConflicts`.
- Produces: `export const rebase: Handler` (hanya cabang `rebase <branch>` di task ini; flag `--continue`/`--abort` ditangani Task 9) dan `export function replay(state: RepoState): CommandResult`, yang melanjutkan penyalinan commit dari `state.rebaseState.remaining` (dipakai ulang oleh `--continue`). Kunci pesan baru: `rebase.needTarget`, `rebase.notFound` (param `branch`), `rebase.notOnBranch`, `rebase.sameBranch`, `rebase.hasMerges`, `rebase.upToDate` (param `branch`), `rebase.fastForward` (param `branch`, `to`), `rebase.done` (param `branch`, `count`), `rebase.conflict` (param `files`, `id`), `rebase.conflictNext`.
- Algoritma (keputusan yang tak bisa ditebak): target harus nama branch; HEAD harus menempel ke branch (detached → `rebase.notOnBranch`); working tree bersih. `onto = branches[target]`, `tip = HEAD id`. Bila `isReachable(state, tip, onto)` → `rebase.upToDate`, ok true, tanpa event. Rentang = `reachableCommits(tip)` yang tidak terjangkau dari `onto`, urut `seq` menaik; bila ada commit rentang berparent > 1 → `rebase.hasMerges`, state tak berubah. Bila `isReachable(state, onto, tip)` → fast-forward: pointer branch ke `onto`, `files`/`index` = `checkoutSnapshot`, event `[rebase-selesai{branch, tip: onto}]` (bukan `merge-fast-forward`) dan output `rebase.fastForward`. Selain itu: set `head` detached di `onto` (files/index = snapshot `onto`), `rebaseState = { branch, onto, originalTip: tip, current: null, remaining: rentang.map(id), conflicts: [] }`, lalu `replay`. `replay` untuk tiap id sisa: `threeWay(base = parent.snapshot, ours = snapshot HEAD saat ini, theirs = commit.snapshot, label = pesan commit)`; tanpa konflik → `createCommit` dengan pesan asli (index = `merged`, files = merged plus file tak terlacak), event `rebase-commit-disalin{from, to}`; ada konflik → tulis `conflictFiles` ke files, index = `merged`, `rebaseState.current = id`, `.remaining` = sisa setelahnya, `.conflicts`, event `konflik-terjadi{files}`, output `rebase.conflict` + `rebase.conflictNext` + baris raw `CONFLICT (content): Merge conflict in {file}`, lalu berhenti (ok: true). Setelah sisa habis: `branches[branch] = head.id`, `head = {type:"branch", name: branch}`, `rebaseState = null`, event `rebase-selesai{branch, tip}`, output `rebase.done`.

- [ ] **Step 1: Write the failing test** (pola setup: `main` maju dua commit di file berbeda, `feature` punya dua commit; tambahan skenario konflik): rebase tanpa konflik → riwayat linear (`isReachable(feature tip, main tip)`), jumlah commit feature sama, pesan sama, id berbeda dari asli, `branches.main` tak berubah, HEAD menempel ke `feature` lagi, `rebaseState` null, commit asli ada di `unreachableCommits`, event `rebase-commit-disalin` dua kali lalu `rebase-selesai`; isi file hasil memuat perubahan main dan feature; fast-forward (feature tak punya commit unik dan tertinggal) memajukan pointer; sudah up-to-date → ok true tanpa event; konflik di commit pertama berhenti dengan `rebaseState.current` = id asli, `conflicts` berisi file, `head` detached, file berisi penanda `<<<<<<<`, `branches.feature` masih `originalTip`; konflik di commit kedua (commit pertama tersalin) berhenti dengan `remaining = []`; merge commit di rentang → `rebase.hasMerges`, state identik (Review Focus 3); HEAD detached → `rebase.notOnBranch` (Review Focus 4); target tak ada → `rebase.notFound`; target = branch aktif → `rebase.sameBranch`; working tree kotor → ditolak; tanpa argumen → `rebase.needTarget`.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/rebase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `rebase` dan `replay`, daftarkan, tambah kunci pesan dan teks id/en.
- [ ] **Step 4: Run** tes di atas lalu `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add git rebase (replay and conflict stop)`

---

### Task 9: `rebase --continue`/`--abort`, pemblokiran, status

**Files:**
- Modify: `engine/commands/rebase.ts`, `engine/commands/commit.ts`, `engine/commands/switch.ts`, `engine/commands/merge.ts`, `engine/commands/status.ts`, `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/rebase.test.ts` (tambah), `engine/__tests__/rebase-blocking.test.ts`

**Interfaces:**
- Consumes: `replay` (Task 8), `createCommit`, `activeConflicts`, `checkoutSnapshot`.
- Produces: pada `rebase`, `args[0] === "--continue"` dan `"--abort"`. Kunci pesan baru: `rebase.notInProgress`, `rebase.continueConflictsRemain` (param `files`), `rebase.aborted` (param `branch`), `status.rebaseInProgress` (param `branch`).
  - `--continue`: tanpa `rebaseState` → `rebase.notInProgress`; `conflicts` tidak kosong → `rebase.continueConflictsRemain`; selain itu buat commit dari index dengan pesan `commits[current].message` (parent = HEAD), event `rebase-commit-disalin{from: current, to}`, `current = null`, lalu panggil `replay`.
  - `--abort`: tanpa `rebaseState` → `rebase.notInProgress`; selain itu `branches[branch]` tetap `originalTip` (tidak diubah), `head` = branch, `files`/`index` = `checkoutSnapshot(state, snapshot originalTip)`, `rebaseState = null`, event `rebase-dibatalkan{branch}`, output `rebase.aborted`.
  - `commit`, `switch`/`checkout`, dan `merge` memanggil `inProgressBlock` di awal bila `rebaseState` aktif (untuk `mergeState` perilaku lama tetap). `status` menambah baris `status.rebaseInProgress` setelah baris branch bila `rebaseState` aktif, dan `status.conflicts` memakai `activeConflicts` (sudah dari Task 1).

- [ ] **Step 1: Write the failing test**: alur lengkap konflik: rebase berhenti, `resolveConflict(..., "theirs")` mengisi file dengan isi commit asli yang sedang disalin dan `"ours"` dengan isi HEAD (dasar baru), `git add` mengosongkan `rebaseState.conflicts`, `git rebase --continue` menyelesaikan: riwayat linear, `rebaseState` null, HEAD menempel ke branch, event `rebase-selesai`; `--continue` saat konflik tersisa → `rebase.continueConflictsRemain`; `--continue` yang menemui konflik kedua berhenti lagi; `--continue` dan `--abort` tanpa rebase → `rebase.notInProgress`; `--abort` mengembalikan `branches.feature` = ujung semula, HEAD di branch, files bersih sama snapshot semula, file tak terlacak aman, salinan commit masuk `unreachableCommits`; saat rebase berhenti, `commit`, `switch`, `checkout`, `merge`, `reset`, `revert`, `cherry-pick`, `stash`, dan `rebase main` semuanya `ok: false` dengan pesan `rebase.inProgress`, sedangkan `status`, `add`, `log`, `branch` tetap jalan; `status` menampilkan `status.rebaseInProgress`.
- [ ] **Step 2: Run** `npx vitest run engine/__tests__/rebase.test.ts engine/__tests__/rebase-blocking.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** kedua flag dan pemblokiran di `commit.ts`, `switch.ts`, `merge.ts`; update `status.ts`; tambah kunci pesan dan teks id/en.
- [ ] **Step 4: Run** `npm test` dan `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add rebase --continue/--abort and in-progress blocking`

---

### Task 10: Graf: node yatim

**Files:**
- Modify: `ui/layout.ts`, `ui/GitGraph.tsx`, `app/globals.css`
- Test: `ui/__tests__/layout.test.ts` (tambah)

**Interfaces:**
- Consumes: `unreachableCommits` (Task 1).
- Produces: `GraphNode` bertambah `orphan: boolean`; `GraphEdge` bertambah `orphan: boolean` (true bila `from` atau `to` yatim). Kelas CSS `gg-node-orphan` (node) dan `gg-edge-orphan` (edge).

- [ ] **Step 1: Write the failing test**: setelah `reset --hard HEAD~1` di riwayat linear 3 commit, node commit teratas punya `orphan: true`, sisanya `false`, edge yang menyentuh node itu `orphan: true`; tanpa reset tidak ada node yatim; setelah rebase selesai, dua commit asli yatim dan dua salinan tidak; selama rebase berhenti karena konflik, commit asli belum yatim; layout tidak melempar error dan semua node punya `lane` bila ada commit yatim.
- [ ] **Step 2: Run** `npx vitest run ui/__tests__/layout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** flag di `computeGraphLayout`; di `GitGraph.tsx` tambahkan kelas `gg-node-orphan`/`gg-edge-orphan` dan `<title>` node yatim menyebut statusnya lewat kunci UI baru `ui.orphanNode` (id dan en: commit tak terjangkau dari branch mana pun, masih ada di git); di `globals.css` node yatim `opacity` rendah dengan `stroke-dasharray` pada garis, edge yatim putus-putus, `transition` pada `opacity`; blok `@media (prefers-reduced-motion: reduce)` yang ada menonaktifkan transisi itu.
- [ ] **Step 4: Run** `npm test` dan `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: draw unreachable commits faded in the graph`

---

### Task 11: Panel Stash, sorotan reset, keterangan "saya/mereka"

**Files:**
- Modify: `ui/AreaPanel.tsx`, `ui/Game.tsx`, `ui/FileEditor.tsx`, `i18n/types.ts`, `i18n/{id,en}/ui.ts`, `app/globals.css`
- Test: `ui/__tests__/area-columns.test.ts` (baru; ekspor `columns` untuk diuji)

**Interfaces:**
- Consumes: `activeConflicts`, `RepoState.stash`, `Level.allowedCommands`.
- Produces: `AreaPanel` menerima prop baru `showStash: boolean` (diisi `Game.tsx` dari `LEVELS[state.levelIndex].allowedCommands.includes("stash")`); ekspor `columns(repo)` mengembalikan juga `stash: Chip[]` (satu chip per entri, `file` = `stash@{i}`, `note` kosong). Kunci UI baru (id dan en): `ui.areaStash`, `ui.areaStashDesc`, `ui.areaStashEmpty`, `ui.editorRebaseNote` (menjelaskan: selama rebase "versi saya" = dasar baru, "versi mereka" = commit yang sedang disalin). `FileEditor` menampilkan `ui.editorRebaseNote` di bawah tombol konflik bila `repo.rebaseState` aktif (prop baru `rebasing: boolean`).
- Sorotan kolom: `litColumn` = `staging` untuk `reset-dilakukan` mode soft, `working` untuk mixed, tidak ada untuk hard; `stash` untuk `stash-disimpan`, `working` untuk `stash-dipulihkan`.

- [ ] **Step 1: Write the failing test**: `columns` pada repo dengan satu entri stash mengembalikan satu chip `stash@{0}`; kosong → `[]`; file konflik rebase berstatus `konflik` di kolom working (lewat `rebaseState` buatan tangan).
- [ ] **Step 2: Run** `npx vitest run ui/__tests__/area-columns.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** kolom Stash (tampil hanya bila `showStash`, dengan label langkah `git stash` / `git stash pop` mengikuti pola `gg-area-step`), logika `litColumn`, keterangan editor, dan gaya CSS kotak keempat (grid `.gg-areas` menyesuaikan jumlah kolom; di bawah `max-width: 640px` tetap bertumpuk).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: stash area, reset highlights and rebase conflict note`

---

### Task 12: Level 11 dan 12 (reset)

**Files:**
- Create: `levels/level-11.ts`, `levels/level-12.ts`
- Modify: `levels/index.ts`, `levels/solve.ts`, `levels/__tests__/solvable.test.ts`
- Test: `levels/__tests__/solvable.test.ts` (diperbarui), `levels/__tests__/level-alt-solutions.test.ts`

**Interfaces:**
- Produces: di `levels/solve.ts`: `idByMessage(state: RepoState, message: string): string` (id commit pertama yang berpesan itu, melempar `Error` bila tidak ada; hanya dipakai saat membangun level), `treeMatchesHead(s: RepoState): boolean` (files sama persis dengan snapshot HEAD dan index sama). `LEVELS` memuat `level11`, `level12` setelah `level10`.
- Level 11 (`id: 11`): judul id "Salah commit" / en "Wrong commit". `initialState = projectSetup([write("app.js", <isi app.js sekarang + baris `console.log('debug');`>), cmd("git add ."), cmd('git commit -m "Add debug logging"')])`; `editor: false`; `allowedCommands` = level 10 + `"reset"`. Tujuan: pesan commit HEAD = "Refactor app init", commit "Add debug logging" tetap ada di `commits`, dan `files["app.js"]` memuat `debug` (jadi `--soft` dan `--mixed` sama-sama diterima, `--hard` tidak). `solution: [cmd("git reset --soft HEAD~1")]`. Cerita menyebut tiga mode secara ringkas tanpa menyebut perintah lengkap.
- Level 12 (`id: 12`): judul id "Buang eksperimen" / en "Discard the experiment". Setup: dua commit "Try experiment A" (menulis `experiment.js`) dan "Try experiment B" (mengubah `experiment.js`). `allowedCommands` sama dengan level 11. Tujuan: pesan commit HEAD = "Refactor app init", `files` tidak punya `experiment.js`, `treeMatchesHead(s)`, dan `unreachableCommits(s).length >= 2`. `solution: [cmd("git reset --hard HEAD~2")]`. Cerita menegaskan commit dibuang dari riwayat tetapi masih terlihat samar di graf.
- Setiap level: tiga petunjuk bertingkat (konsep → di mana melihat → bentuk perintah tanpa argumen lengkap) dalam id dan en; tidak boleh memuat `git reset --soft head~1` atau bentuk solusi lain secara utuh.

- [ ] **Step 1: Write the failing test**: perbarui `solvable.test.ts` agar `LEVELS.map(l => l.id)` sama dengan `[1..12]`; buat `level-alt-solutions.test.ts` yang menguji level 11 terpenuhi oleh `git reset HEAD~1` (mixed), `git reset --soft HEAD~1`, dan oleh hash eksplisit dari `idByMessage`, dan **tidak** terpenuhi oleh `git reset --hard HEAD~1`; level 12 terpenuhi oleh `git reset --hard HEAD~2` dan oleh hash, tidak oleh `--soft`/`--mixed`.
- [ ] **Step 2: Run** `npx vitest run levels/`. Expected: FAIL.
- [ ] **Step 3: Implement** level, helper, dan daftarkan di `levels/index.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, termasuk tes kebocoran petunjuk, paritas id/en, dan "belum selesai di state awal".
- [ ] **Step 5: Commit** `feat: add levels 11-12 (reset)`

---

### Task 13: Level 13, 14, dan 15 (revert, stash, cherry-pick)

**Files:**
- Create: `levels/level-13.ts`, `levels/level-14.ts`, `levels/level-15.ts`
- Modify: `levels/index.ts`, `levels/__tests__/solvable.test.ts`
- Test: `levels/__tests__/level-alt-solutions.test.ts` (tambah)

**Interfaces:**
- Consumes: `idByMessage`, `treeMatchesHead`, `unreachableCommits`, `isReachable`.
- Level 13 (`id: 13`, id "Batalkan tanpa menulis ulang" / en "Undo without rewriting"): setup dua commit setelah riwayat proyek: "Add risky tracking" (ubah `app.js`) lalu "Update footer text" (ubah `index.html`). `allowedCommands` + `"revert"`. Tujuan: pesan HEAD diawali `Revert`, `files["app.js"]` sama dengan isi `app.js` sebelum commit buruk, `files["index.html"]` masih memuat teks footer baru, dan ujung awal ("Update footer text") masih leluhur HEAD. `solution: [cmd(\`git revert ${idByMessage(initialState, "Add risky tracking")}\`)]`.
- Level 14 (`id: 14`, id "Simpan sementara" / en "Set it aside"): setup `cmd("git branch hotfix")` lalu `write("app.js", <app.js dengan satu baris tambahan kerja-setengah-jadi>)` tanpa add (perubahan tak ter-stage di `main`). `allowedCommands` + `"stash"`; `editor: true`. Tujuan: HEAD di branch `main`, `files["app.js"]` sama dengan isi kerja setengah jadi, `stash` kosong, dan ujung `hotfix` berbeda dari ujung `main` serta `hotfix` berisi commit berpesan apa pun yang tidak ada di `main`. `mustRun: ["stash"]`. Solusi: `git stash`, `git switch hotfix`, `write("style.css", ...)`, `git add .`, `git commit -m "Fix navbar typo"`, `git switch main`, `git stash pop`. Cerita menegaskan pesan `switch` yang gagal saat ada perubahan belum di-commit sebagai pemicu belajar. Petunjuk tidak boleh memuat `git stash` utuh (gunakan frasa "simpan sementara").
- Level 15 (`id: 15`, id "Ambil satu commit" / en "Pick one commit"): setup `git switch -c experiment`, tiga commit: "Experiment: new layout" (ubah `style.css`), "Fix null check in login" (ubah `login.js`), "Experiment: dark mode" (ubah `style.css` lagi), lalu `git switch main`. `allowedCommands` + `"cherry-pick"`. Tujuan: HEAD di `main`, pesan ujung `main` = "Fix null check in login", `files["login.js"]` sama dengan hasil perbaikan, `files["style.css"]` sama dengan isi `style.css` di commit "Refactor app init" milik `main` (tidak berubah), ujung `experiment` masih "Experiment: dark mode", dan id ujung `main` ≠ id commit sumber. `solution: [cmd(\`git cherry-pick ${idByMessage(initialState, "Fix null check in login")}\`)]`.
- Semua level: tiga petunjuk id dan en tanpa kebocoran perintah solusi (termasuk `git revert <hash>`, `git cherry-pick <hash>`).

- [ ] **Step 1: Write the failing test**: perbarui daftar id menjadi `[1..15]`; tes solusi alternatif: level 13 gagal bila pemain memakai `git reset --hard HEAD~2` (ujung awal bukan leluhur HEAD), level 14 tidak selesai tanpa `stash pop` (stash masih berisi), level 15 gagal bila memakai `git merge experiment` (ada commit tak diinginkan).
- [ ] **Step 2: Run** `npx vitest run levels/`. Expected: FAIL.
- [ ] **Step 3: Implement** ketiga level dan daftarkan.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add levels 13-15 (revert, stash, cherry-pick)`

---

### Task 14: Level 16 dan 17 (rebase), peta level, verifikasi akhir

**Files:**
- Create: `levels/level-16.ts`, `levels/level-17.ts`
- Modify: `levels/index.ts`, `levels/__tests__/solvable.test.ts`, `ui/LevelMap.tsx`, `app/globals.css`
- Test: `levels/__tests__/level-alt-solutions.test.ts` (tambah)

**Interfaces:**
- Level 16 (`id: 16`, id "Pindahkan dasar" / en "Move the base"): setup `git switch -c feature`, dua commit di `feature` ("Add profile page" menulis `profile.js`, "Style profile page" menulis `profile.css`), `git switch main`, dua commit di `main` ("Update contributing guide" mengubah `CONTRIBUTING.md`, "Update readme" mengubah `README.md`), lalu `git switch feature`. `allowedCommands` + `"rebase"`. Tujuan: HEAD di `feature`, `rebaseState` null, `isReachable(s, branches.feature, branches.main)`, dua commit pesan "Add profile page" dan "Style profile page" masih ada sebagai riwayat linear di atas `main` (tepat 2 commit unik), dan `unreachableCommits(s).length >= 2`. `solution: [cmd("git rebase main")]`.
- Level 17 (`id: 17`, id "Rebase berkonflik" / en "Rebase with a conflict"): sama dengan level 16 tetapi satu commit `feature` ("Rename project title") mengubah baris judul `README.md` dan commit `main` ("Update readme") mengubah baris yang sama; `editor: true`. Tujuan: sama dengan level 16 ditambah `files["README.md"]` tidak memuat `<<<<<<<`. `solution: [cmd("git rebase main"), { kind: "resolve", file: "README.md", choice: "theirs" }, cmd("git add README.md"), cmd("git rebase --continue")]`. Petunjuk tidak boleh memuat `git rebase --continue` atau `git rebase main` utuh.
- `ui/LevelMap.tsx`: ubah komentar menjadi "Satu jalur stasiun per level". `app/globals.css` (`.gg-map ol`, `.gg-map li`): jalur tidak boleh meluap di lebar sempit dengan 17 stasiun (bungkus ke baris berikutnya atau gulir horizontal dengan `overflow-x: auto`; pilih yang menjaga garis penghubung `li::before` tetap rapi).

- [ ] **Step 1: Write the failing test**: daftar id `[1..17]`; level 16 diselesaikan oleh `git rebase main` tetapi tidak oleh `git merge main` (riwayat tidak linear dan commit asli tidak yatim); level 17 tidak selesai bila pemain berhenti di tengah rebase (`rebaseState` aktif), dan selesai dengan pilihan "ours" maupun "theirs" untuk `README.md` (kedua jalur diterima); `git rebase --abort` membuat tujuan level 17 tetap tidak tercapai.
- [ ] **Step 2: Run** `npx vitest run levels/`. Expected: FAIL.
- [ ] **Step 3: Implement** kedua level, daftarkan, sesuaikan `LevelMap` dan CSS.
- [ ] **Step 4: Run** verifikasi penuh: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Expected: semua hijau tanpa peringatan tipe.
- [ ] **Step 5: Commit** `feat: add levels 16-17 (rebase) and 17-station map`

---

### Task 15: Pengecekan manual di browser

**Files:** tidak ada perubahan kode kecuali perbaikan yang ditemukan.

- [ ] **Step 1:** Jalankan `npm run dev`, buka halaman game, buka kunci semua level (isi `localStorage` progres dengan id 1–16 atau selesaikan berurutan).
- [ ] **Step 2:** Untuk tiap level 11–17 jalankan skrip solusinya lewat terminal dan editor; periksa: commit yatim memudar dengan transisi (level 12 dan 16), kotak Stash muncul dan chip berpindah (level 14), kolom area menyala sesuai mode reset (level 11), label HEAD detached bergerak selama rebase dan keterangan "versi saya/mereka" muncul (level 17), caption benar, bahasa id dan en, peta 17 level tidak meluap di lebar ≤ 640px.
- [ ] **Step 3:** Ulangi dengan `prefers-reduced-motion: reduce` (perubahan instan dengan highlight singkat) dan mode gelap.
- [ ] **Step 4:** Perbaiki temuan dengan tes dulu bila bisa diuji; commit `fix: ...` per temuan.
