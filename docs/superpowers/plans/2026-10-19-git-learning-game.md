# Game Belajar Git Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun game belajar git di browser (10 level, terminal simulasi + tombol, visualisasi graf commit dan tiga area) di atas scaffold Next.js yang sudah ada.

**Architecture:** `engine/` (TypeScript murni, state immutable, tiap perintah mengembalikan state baru + output + event), `levels/` (data level + skrip solusi), `ui/` (komponen React client-side, reducer game, antrean event untuk highlight/caption). Animasi gerak memakai transisi CSS pada elemen SVG; antrean event hanya mengatur highlight dan kalimat penjelasan.

**Tech Stack:** Next.js 16.4.2, React 19.3.0, TypeScript 5, Tailwind 4 (sudah terpasang), Vitest (ditambahkan).

**Spec:** `docs/superpowers/specs/2026-10-19-git-learning-game-design.md`

## Global Constraints

- Teks game dan pesan error dalam Bahasa Indonesia; pesan asli git ditampilkan di bawahnya.
- `engine/` dan `levels/` tidak boleh mengimpor dari `next` atau `react`.
- Folder `engine/`, `levels/`, `ui/` berada di root proyek bersebelahan dengan `app/` (tanpa `src`). `app/page.tsx` hanya merakit komponen dari `ui/`.
- Engine tidak pernah melempar exception ke UI; kegagalan dikembalikan sebagai `ok: false`.
- Daftar event wajib persis: `repo-dibuat`, `file-di-stage`, `commit-dibuat`, `branch-dibuat`, `branch-dihapus`, `branch-pindah`, `head-pindah`, `merge-fast-forward`, `merge-commit-dibuat`, `konflik-terjadi`, `konflik-selesai`.
- Progres level di `localStorage` kunci `gg-git-game:completed`; semua akses dibungkus try/catch.
- `AGENTS.md` mewajibkan membaca `node_modules/next/dist/docs/` sebelum menulis kode Next (Task 9 dan 10). `next.config.ts` mengaktifkan `cacheComponents` dan `partialPrefetching`; halaman game harus tetap bisa di-build.
- Commit message tanpa baris `Co-Authored-By`.
- Lingkungan eksekusi: jika sesi tidak punya shell di komputer pengguna, kerjakan salinan proyek di container (`npm install` di sana), lalu sinkronkan file kembali dengan `device_commit_files`; langkah `git commit` dijalankan pengguna.
- Catatan perubahan spec: spec 3.5 menilai level dari state saja, tetapi `status` dan `log` tidak mengubah state. Level mendapat field opsional `mustRun: string[]` (perintah yang harus pernah dijalankan dengan sukses di level itu, urutan bebas) selain `isGoalReached`. Spec diperbarui sejalan.

## Review Focus

1. `git commit` tanpa perubahan di staging → error ramah ("nothing to commit"), bukan commit kosong (Task 3).
2. Perintah apa pun selain `init` sebelum `git init` → pesan "bukan repositori git" (Task 1).
3. Branch: nama tidak valid, nama kembar, hapus branch aktif, hapus branch yang belum di-merge, merge branch yang tidak ada atau branch sendiri, pindah branch saat ada perubahan belum di-commit (Task 4, 5).
4. Input aneh: kosong, spasi ganda, tanda kutip `-m "..."` tidak tertutup, hanya `git`, tidak diawali `git` (Task 1).
5. `localStorage` tidak tersedia atau berisi data rusak → game mulai dari level 1 tanpa crash (Task 8).

---

### Task 1: Fondasi engine + Vitest

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.ts`, `engine/types.ts`, `engine/hash.ts`, `engine/parse.ts`, `engine/state.ts`, `engine/index.ts`, `engine/commands/init.ts`
- Test: `engine/__tests__/parse.test.ts`, `engine/__tests__/init.test.ts`

**Interfaces:**
- Produces (`engine/types.ts`):
  - `type Files = Record<string, string>`
  - `interface Commit { id: string; seq: number; parents: string[]; message: string; snapshot: Files }`
  - `type Head = { type: 'branch'; name: string } | { type: 'detached'; id: string }`
  - `interface MergeState { from: string; fromCommit: string; conflicts: string[] }`
  - `interface RepoState { initialized: boolean; files: Files; index: Files; commits: Record<string, Commit>; branches: Record<string, string>; head: Head; mergeState: MergeState | null }`
  - `GitEvent` = union persis event pada Global Constraints, payload: `file-di-stage {file}`, `commit-dibuat {id, parents: string[]}`, `branch-dibuat {name, at}`, `branch-dihapus {name}`, `branch-pindah {from, to}`, `head-pindah {id}`, `merge-fast-forward {branch, to}`, `merge-commit-dibuat {id, parents: [string, string]}`, `konflik-terjadi {files: string[]}`; `repo-dibuat` dan `konflik-selesai` tanpa payload.
  - `interface CommandResult { state: RepoState; output: string; events: GitEvent[]; ok: boolean }`
- Produces: `shortHash(seed: string): string` (FNV-1a, 7 karakter hex), `parseInput(input: string): ParsedCommand | { error: string }` dengan `ParsedCommand = { name: string; args: string[] }`, `createEmptyRepo(files?: Files): RepoState`, `runCommand(state: RepoState, input: string): CommandResult`, `getHeadCommitId(state: RepoState): string | null` (di `engine/state.ts`, dipakai task lain).

- [ ] **Step 1: Tulis tes gagal.** `parse.test.ts`: `parseInput('git commit -m "pesan  dua"')` → `{name:'commit', args:['-m','pesan  dua']}`; `'git   status'` → name `status`; `''`, `'git'`, `'commit'`, `'git commit -m "x'` masing-masing mengembalikan objek berisi `error` (string tidak kosong, yang pertama untuk input tak diawali `git` menyebut kata `git`). `init.test.ts`: `runCommand(createEmptyRepo(), 'git init')` → `ok` true, `state.initialized` true, `state.head` `{type:'branch',name:'main'}`, `events` `[{type:'repo-dibuat'}]`; `init` kedua → `ok` false; `git status` pada repo belum init → `ok` false dan output memuat `bukan repositori git` serta `fatal: not a git repository`; `git foo` → `ok` false, output memuat `foo`.
- [ ] **Step 2: Pasang Vitest** (`npm i -D vitest`), buat `vitest.config.ts` (environment `node`, include `**/__tests__/**/*.test.ts`), jalankan `npx vitest run`. Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implementasi** tipe, `shortHash`, `parseInput` (token dipisah spasi, tanda kutip ganda mengelompokkan), `createEmptyRepo` (`initialized:false`, `head` branch `main`, `branches:{}`, `index:{}`, `mergeState:null`), `init`, dan dispatcher `runCommand` di `engine/index.ts` yang memetakan nama → handler (handler lain didaftarkan task berikutnya), menolak semua perintah selain `init` bila belum `initialized`, dan menolak nama tak dikenal.
- [ ] **Step 4: Jalankan `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git add . && git commit -m "feat(engine): fondasi engine, parser, init"`

### Task 2: `status`, `add`, dan penyunting file

**Files:**
- Create: `engine/commands/status.ts`, `engine/commands/add.ts`, `engine/files.ts`
- Modify: `engine/index.ts` (daftarkan `status`, `add`)
- Test: `engine/__tests__/status-add.test.ts`

**Interfaces:**
- Consumes: Task 1 (`RepoState`, `CommandResult`, `getHeadCommitId`).
- Produces (`engine/files.ts`): `interface EditResult { state: RepoState; error?: string }`; `writeFile(state: RepoState, name: string, content: string): EditResult` (membuat/menimpa; nama harus cocok `/^[\w.-]+$/`, selain itu `error` terisi dan state tidak berubah).
- Produces: `status` mencetak bagian `Di branch <nama>`, `Perubahan yang akan di-commit:`, `Perubahan yang belum di-stage:`, `File yang belum dilacak:` (hanya bagian yang tidak kosong), atau `Tidak ada yang perlu di-commit, working tree bersih` bila semua kosong; saat `mergeState` ada, tambah bagian `Konflik belum diselesaikan:` berisi `mergeState.conflicts`.

- [ ] **Step 1: Tulis tes gagal.** `writeFile` file baru lalu `status` memuat `File yang belum dilacak:` dan nama file; `add a.txt` → `index['a.txt']` sama dengan isi, event `[{type:'file-di-stage', file:'a.txt'}]`; ubah isi lalu `status` memuat `Perubahan yang belum di-stage:`; `add .` men-stage semua yang berbeda dari index dan tidak membuat event untuk file yang sama; `add nope.txt` → `ok` false, output memuat `did not match any files`; `add` tanpa argumen → `ok` false; `writeFile(s, 'a b', 'x')` → `error` terisi. Saat `mergeState.conflicts = ['a.txt']`, `add a.txt` menghapus `a.txt` dari `conflicts`.
- [ ] **Step 2: Jalankan `npx vitest run engine/__tests__/status-add.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implementasi** `status`, `add`, `writeFile`. Perbandingan "staged" = `index` vs snapshot commit HEAD (kosong bila belum ada commit); "belum di-stage" = `files` vs `index` untuk path yang ada di `index`; "belum dilacak" = path di `files` yang tidak ada di `index`.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(engine): status, add, writeFile"`

### Task 3: `commit` dan `log`

**Files:**
- Create: `engine/commands/commit.ts`, `engine/commands/log.ts`
- Modify: `engine/index.ts`
- Test: `engine/__tests__/commit-log.test.ts`

**Interfaces:**
- Consumes: Task 1, 2.
- Produces: `commit -m "<pesan>"` membuat `Commit` dengan `id = shortHash(JSON.stringify({parents, message, snapshot}))`, `seq = jumlah commit sebelumnya`, `snapshot = salinan index`; memajukan branch HEAD (atau `head.id` bila detached); event `commit-dibuat {id, parents}`; output `[<branch> <id>] <pesan>`. Bila `mergeState` ada: gagal jika `conflicts` tidak kosong; jika kosong, commit punya `parents [ourCommit, mergeState.fromCommit]`, event `commit-dibuat` lalu `merge-commit-dibuat` lalu `konflik-selesai`, dan `mergeState` menjadi `null`. `log` menampilkan commit yang dapat dijangkau dari HEAD, urut `seq` menurun; `--oneline` → baris `<id> <pesan>`; default → `commit <id>` + baris `    <pesan>`.

- [ ] **Step 1: Tulis tes gagal.** (a) commit pertama: parents `[]`, `branches.main` = id, output memuat id; (b) commit tanpa `-m` atau pesan kosong → `ok` false; (c) **commit tanpa perubahan di staging** → `ok` false, output memuat `nothing to commit` (Review Focus 1); (d) commit kedua punya parent commit pertama dan id berbeda; (e) `log --oneline` mencantumkan kedua commit dengan yang terbaru lebih dulu; (f) `log` sebelum ada commit → `ok` false, memuat `does not have any commits yet`; (g) commit saat `mergeState.conflicts` tidak kosong → `ok` false.
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi `commit` dan `log`** sesuai Interfaces.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(engine): commit dan log"`

### Task 4: `branch`, `switch`, `checkout`

**Files:**
- Create: `engine/commands/branch.ts`, `engine/commands/switch.ts`
- Modify: `engine/index.ts` (daftarkan `branch`, `switch`, `checkout`)
- Test: `engine/__tests__/branch-switch.test.ts`

**Interfaces:**
- Consumes: Task 1–3.
- Produces: `isReachable(state: RepoState, fromId: string, targetId: string): boolean` di `engine/state.ts` (dipakai Task 5). Aturan nama branch valid: `/^[A-Za-z0-9._\/-]+$/` dan tidak diawali `-`.
- `branch` (daftar, penanda `* ` pada branch aktif), `branch <nama>` (event `branch-dibuat {name, at}`), `branch -d <nama>`. Error: belum ada commit, nama tidak valid, nama kembar (`already exists`), hapus tidak ditemukan, hapus branch aktif (`checked out`), hapus branch yang ujungnya tidak terjangkau dari HEAD (`not fully merged`).
- `switch <nama>`, `switch -c <nama>`, `checkout <nama>`, `checkout -b <nama>`, `checkout <commit-id>` (detached, event `head-pindah`). Pindah branch memberi event `branch-pindah {from, to}`; `files` dan `index` menjadi snapshot target ditambah file yang tidak dilacak (path di `files` yang tidak ada di `index`) tetap ada. Menolak bila ada perubahan terlacak yang belum di-commit (`index` ≠ snapshot HEAD atau `files` ≠ `index` untuk path terlacak) dengan pesan memuat `Please commit your changes`. Pindah ke branch yang sedang aktif → `ok` true, output `Already on '<nama>'`, tanpa event. Target tidak ada → `ok` false, memuat `invalid reference`.

- [ ] **Step 1: Tulis tes gagal** untuk setiap perilaku di atas, termasuk: `switch -c fitur` membuat branch di commit HEAD dan memindahkan HEAD (events berurutan `branch-dibuat`, `branch-pindah`); file isi berubah sesuai snapshot setelah `switch`; file tak terlacak tetap ada; `branch Fitur Baru`/`branch -x` → `ok` false (nama tidak valid); `branch fitur` dua kali → `ok` false; `branch -d main` saat di main → `ok` false; `branch -d fitur` untuk branch yang punya commit sendiri → `not fully merged`; `switch` dengan file terlacak diubah tanpa commit → `ok` false (Review Focus 3).
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi** `branch`, `switch` (satu handler dipakai oleh `switch` dan `checkout`), dan `isReachable`.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(engine): branch, switch, checkout"`

### Task 5: `merge` dan penyelesaian konflik

**Files:**
- Create: `engine/commands/merge.ts`
- Modify: `engine/files.ts` (tambah `resolveConflict`), `engine/index.ts`
- Test: `engine/__tests__/merge.test.ts`

**Interfaces:**
- Consumes: Task 1–4 (`isReachable`, `writeFile`).
- Produces: `resolveConflict(state: RepoState, file: string, choice: 'ours' | 'theirs'): EditResult` — mengisi `files[file]` dengan isi dari snapshot commit HEAD (`ours`) atau commit `mergeState.fromCommit` (`theirs`); `error` terisi bila `file` tidak ada di `mergeState.conflicts`. Tidak men-stage.
- `merge <branch>`: (1) branch tidak ada → `ok` false (`not something we can merge`); (2) branch sama dengan aktif atau sudah terjangkau dari HEAD → `ok` true, `Already up to date.`, tanpa event; (3) HEAD terjangkau dari target → fast-forward: branch HEAD dan `files`/`index` mengikuti target, event `merge-fast-forward {branch, to}`; (4) selain itu three-way per path (ancestor bersama = commit terjangkau dari kedua sisi dengan `seq` terbesar): sama di kedua sisi → ambil; hanya satu sisi berubah dari base → ambil sisi itu; keduanya berubah berbeda → konflik. Tanpa konflik: langsung buat merge commit pesan `Merge branch '<branch>'`, parents `[ours, theirs]`, events `commit-dibuat`, `merge-commit-dibuat`. Dengan konflik: file konflik ditulis `<<<<<<< HEAD\n<ours>\n=======\n<theirs>\n>>>>>>> <branch>`, file lain yang bersih ikut di-stage, `mergeState = {from, fromCommit, conflicts}`, event `konflik-terjadi {files}`, `ok` true dengan output `CONFLICT (content): Merge conflict in <file>`. Menolak bila `mergeState` ada (`You have not concluded your merge`) atau ada perubahan terlacak belum di-commit.

- [ ] **Step 1: Tulis tes gagal** dengan helper pembangun repo: fast-forward (branch `main` maju ke ujung `fitur`, `branches.main === branches.fitur`); merge commit (dua cabang mengubah file berbeda → commit baru dengan 2 parent, kedua file ada di `files`); konflik (kedua cabang mengubah `README.md` berbeda → `mergeState.conflicts` `['README.md']`, `files['README.md']` memuat `<<<<<<< HEAD`); alur selesai: `resolveConflict(...,'ours')` → `add README.md` → `commit -m "x"` menghasilkan commit 2 parent dan `mergeState` null serta event `konflik-selesai`; `merge fitur` saat sudah up to date; `merge nope`; `merge main` di main; `merge` saat `mergeState` ada → `ok` false.
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi** `merge` dan `resolveConflict`.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(engine): merge dan penyelesaian konflik"`

### Task 6: Data 10 level + uji kelayakan

**Files:**
- Create: `levels/types.ts`, `levels/solve.ts`, `levels/level-01.ts` … `levels/level-10.ts`, `levels/index.ts`
- Test: `levels/__tests__/solvable.test.ts`

**Interfaces:**
- Consumes: `runCommand`, `writeFile`, `resolveConflict`, `createEmptyRepo`.
- Produces (`levels/types.ts`): `type SolutionStep = { kind: 'cmd'; input: string } | { kind: 'write'; file: string; content: string } | { kind: 'resolve'; file: string; choice: 'ours' | 'theirs' }`; `interface ButtonSpec { label: string; command: string }`; `interface Level { id: number; title: string; story: string; goal: string; mode: 'buttons' | 'terminal' | 'hybrid'; editor: boolean; allowedCommands: string[]; buttons: ButtonSpec[]; initialState: RepoState; hints: string[]; isGoalReached: (s: RepoState) => boolean; mustRun?: string[]; solution: SolutionStep[] }`.
- Produces (`levels/solve.ts`): `applySteps(state: RepoState, steps: SolutionStep[]): RepoState` (melempar Error jika langkah `cmd` menghasilkan `ok: false`; dipakai juga untuk membangun `initialState` level 5–10). `levels/index.ts` mengekspor `LEVELS: Level[]` urut id 1–10.

Isi tiap level (semua `story`, `goal`, `hints` — minimal 2 petunjuk bertingkat — ditulis dalam Bahasa Indonesia; `allowedCommands` kumulatif):

| # | initialState | mode / editor | goal (`isGoalReached`) + `mustRun` | solution |
|---|---|---|---|---|
| 1 | repo kosong belum init, `files {README.md}` | buttons / tidak | `initialized` | `git init` |
| 2 | init, `files {README.md}` | buttons / ya | `files['catatan.txt']` ada; `mustRun ['status']` | write `catatan.txt`, `git status` |
| 3 | init, `files {README.md, catatan.txt}` | buttons / tidak | `index` memuat kedua file | `git add .` |
| 4 | init, kedua file sudah di-stage | buttons / tidak | jumlah commit ≥ 1 | `git commit -m "Commit pertama"` |
| 5 | init + 3 commit | hybrid / ya | jumlah commit ≥ 4; `mustRun ['log']` | `git log`, write file, `git add .`, `git commit -m "Commit keempat"` |
| 6 | 1 commit di main | terminal / tidak | `branches.fitur` ada | `git branch fitur` |
| 7 | 1 commit, branch `fitur` ada, HEAD di main | terminal / tidak | `head` = branch `fitur` | `git switch fitur` |
| 8 | main di c1, `fitur` punya 1 commit lebih, HEAD di main | terminal / tidak | `branches.main === branches.fitur` | `git merge fitur` |
| 9 | main dan `fitur` bercabang, mengubah file berbeda, HEAD di main | terminal / tidak | commit HEAD punya 2 parent | `git merge fitur` |
| 10 | main dan `fitur` mengubah `README.md` berbeda, HEAD di main | terminal / ya | `mergeState` null dan commit HEAD punya 2 parent | `git merge fitur`, resolve `README.md` ours, `git add README.md`, `git commit -m "Selesaikan konflik"` |

`buttons` level 1–4 (dan 5): satu tombol per perintah yang relevan, `command` berisi string lengkap (mis. `git add .`, `git commit -m "Commit pertama"`); level 6–10 `buttons: []`.

- [ ] **Step 1: Tulis tes gagal** `solvable.test.ts`: `LEVELS` panjang 10 dan `id` berurutan; untuk tiap level: `isGoalReached(initialState)` false; setelah `applySteps(initialState, solution)` → `isGoalReached` true; setiap langkah `cmd` memakai nama perintah (token kedua) yang ada di `allowedCommands`; `mustRun` ⊆ nama perintah dalam `solution`; `hints.length >= 2`; level `buttons`/`hybrid` punya `buttons.length > 0`.
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi** tipe, `applySteps`, 10 berkas level, `LEVELS`.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(levels): 10 level dengan uji kelayakan"`

### Task 7: Layout graf dan caption

**Files:**
- Create: `ui/layout.ts`, `ui/caption.ts`
- Test: `ui/__tests__/layout.test.ts`, `ui/__tests__/caption.test.ts`

**Interfaces:**
- Consumes: `RepoState`, `GitEvent`.
- Produces (`ui/layout.ts`): `interface GraphNode { id: string; message: string; x: number; y: number; lane: number }`; `interface GraphEdge { from: string; to: string }` (dari commit ke parent); `interface GraphLabel { name: string; kind: 'branch' | 'head'; commitId: string }`; `interface GraphLayout { nodes: GraphNode[]; edges: GraphEdge[]; labels: GraphLabel[]; width: number; height: number }`; `computeGraphLayout(state: RepoState): GraphLayout`. Aturan: `depth` = 0 untuk root, selain itu 1 + maks depth parent; `x = depth * 80 + 40`; urutan jalur: `main` pertama, lalu branch lain alfabetis; `lane` sebuah commit = indeks jalur pertama yang dapat menjangkaunya lewat rantai parent pertama, commit lain (mis. detached) lane 0; `y = lane * 60 + 40`; label `branch` untuk tiap branch, label `head` menempel di commit HEAD (untuk HEAD di branch yang belum punya commit, tidak ada label head).
- Produces (`ui/caption.ts`): `describeEvents(events: GitEvent[]): string` — satu kalimat Indonesia dari event terakhir yang bermakna; contoh pinned: `merge-fast-forward {branch:'main', to:'a3f9c1e'}` → ``Pointer `main` maju ke commit `a3f9c1e`. Tidak ada commit baru yang dibuat.``; daftar kosong → string kosong.

- [ ] **Step 1: Tulis tes gagal.** Layout: rantai 3 commit di main → y sama dan x naik 80; branch `fitur` dengan commit sendiri → y berbeda dari main; merge commit menghasilkan 2 edge dari id-nya; repo tanpa commit → `nodes` kosong tanpa error; label `head` menempel pada commit yang ditunjuk branch aktif. Caption: kalimat fast-forward di atas persis; tiap jenis event lain menghasilkan string tidak kosong; `[]` → `''`.
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi** kedua fungsi sesuai aturan.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): layout graf dan caption"`

### Task 8: Reducer game dan penyimpanan progres

**Files:**
- Create: `ui/game-state.ts`, `ui/progress.ts`
- Test: `ui/__tests__/game-state.test.ts`, `ui/__tests__/progress.test.ts`

**Interfaces:**
- Consumes: `LEVELS`, `runCommand`, `writeFile`, `resolveConflict`, `describeEvents`.
- Produces (`ui/game-state.ts`): `interface TerminalLine { kind: 'input' | 'output' | 'error'; text: string }`; `interface GameState { levelIndex: number; repo: RepoState; completed: number[]; ran: string[]; failedAttempts: number; lines: TerminalLine[]; events: GitEvent[]; caption: string; levelComplete: boolean }`; `type GameAction = { type: 'run'; input: string } | { type: 'write'; file: string; content: string } | { type: 'resolve'; file: string; choice: 'ours' | 'theirs' } | { type: 'reset-level' } | { type: 'goto-level'; index: number }`; `initGame(completed: number[]): GameState` (level pertama yang belum selesai, atau level terakhir bila semua selesai); `reduce(state: GameState, action: GameAction): GameState`; `visibleHints(state: GameState): string[]`; `isUnlocked(completed: number[], index: number): boolean` (indeks 0 selalu terbuka; selain itu butuh `completed` memuat `LEVELS[index - 1].id`; `completed` menyimpan `level.id` 1–10).
- Aturan `run`: tambah baris `input`; bila nama perintah (token kedua) tidak ada di `allowedCommands` level → baris `error` ``Perintah ini belum dipakai di level ini.``, `failedAttempts + 1`, repo tidak berubah; selain itu jalankan `runCommand`, tambah baris `output`/`error` sesuai `ok`, `failedAttempts + 1` bila `!ok`, tambah nama perintah ke `ran` bila `ok`, set `events` dan `caption`. Setelah setiap aksi (`run`, `write`, `resolve`) hitung `levelComplete = isGoalReached(repo) && mustRun ⊆ ran`; bila true tambahkan id level ke `completed` (tanpa duplikat). `visibleHints` = `hints.slice(0, Math.min(hints.length, Math.floor(failedAttempts / 2)))`. `reset-level` → repo `initialState`, `lines` kosong, `ran` kosong, `failedAttempts` 0, `levelComplete` false, `completed` tetap. `goto-level` ditolak (state tetap) bila terkunci.
- Produces (`ui/progress.ts`): `loadCompleted(storage?: Pick<Storage, 'getItem'>): number[]`, `saveCompleted(completed: number[], storage?: Pick<Storage, 'setItem'>): void`; storage default `globalThis.localStorage` bila ada; kunci `gg-git-game:completed`; `loadCompleted` mengembalikan `[]` untuk storage yang melempar, JSON rusak, atau bukan array angka; `saveCompleted` tidak pernah melempar.

- [ ] **Step 1: Tulis tes gagal.** Reducer: menjalankan solusi level 1 lewat `run` menandai `levelComplete` dan mengisi `completed`; perintah di luar `allowedCommands` → baris error + `failedAttempts` naik; level 2 belum selesai sebelum `status` dijalankan walau file sudah ada, dan selesai sesudahnya; `visibleHints` kosong pada 0–1 kegagalan dan berisi 1 petunjuk pada 2; `reset-level` seperti aturan; `goto-level` ke indeks 2 saat `completed=[]` ditolak dan diterima saat `completed=[1,2]`; `isUnlocked([], 1)` false, `isUnlocked([1], 1)` true, `isUnlocked([], 0)` true. Progres: stub storage yang melempar → `[]`; `'{rusak'` → `[]`; `'["a"]'` → `[]`; `'[1,2]'` → `[1,2]`; `saveCompleted` dengan storage yang melempar tidak melempar (Review Focus 5).
- [ ] **Step 2: Jalankan tes.** Expected: FAIL.
- [ ] **Step 3: Implementasi** `game-state.ts` dan `progress.ts`.
- [ ] **Step 4: Jalankan seluruh `npx vitest run`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): reducer game dan penyimpanan progres"`

### Task 9: Komponen visualisasi (GitGraph, AreaPanel, antrean event)

**Files:**
- Create: `ui/GitGraph.tsx`, `ui/AreaPanel.tsx`, `ui/useEventQueue.ts`
- Modify: `app/globals.css` (kelas `.gg-anim`, keyframes `node-enter`, `edge-draw`, transisi `transform 400ms` untuk label, highlight; blok `@media (prefers-reduced-motion: reduce)` yang mematikan transition/animation)

**Interfaces:**
- Consumes: `computeGraphLayout`, `RepoState`, `GitEvent`.
- Produces: `GitGraph({ layout, activeEvent }: { layout: GraphLayout; activeEvent: GitEvent | null })` — SVG; node berkunci `id`; node yang baru muncul memakai kelas animasi masuk; label branch/HEAD berupa pill (HEAD warna berbeda) yang bergeser lewat transisi CSS; merge commit menggambar edge kedua dengan animasi; elemen yang disebut `activeEvent` diberi kelas highlight. `AreaPanel({ repo, activeEvent })` — tiga kolom `Working` / `Staging` / `Repository` berisi chip nama file (working: file yang beda dari `index` atau tak terlacak; staging: `index` yang beda dari snapshot HEAD; repository: snapshot HEAD); chip berkunci nama file agar berpindah kolom dengan animasi masuk. `useEventQueue(events: GitEvent[], stepMs = 600): { active: GitEvent | null; skip: () => void }` — memutar event berurutan; `skip` mengosongkan antrean; bila `prefers-reduced-motion` aktif, tampilkan hanya event terakhir.

- [ ] **Step 1: Baca dokumentasi Next** di `node_modules/next/dist/docs/` (client components, `cacheComponents`) sesuai `AGENTS.md`, dan buka `tsconfig.json` untuk alias impor; ikuti konvensi yang ditemukan.
- [ ] **Step 2: Implementasi** ketiga berkas dan CSS di atas; komponen berupa client component (`'use client'`), tanpa logika git di dalamnya (semua turunan dari `RepoState`/`layout`).
- [ ] **Step 3: Verifikasi.** Run: `npx tsc --noEmit && npm run lint`. Expected: tanpa error. (Tampilan diverifikasi manual di Task 10 setelah dirakit.)
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): komponen visualisasi graf dan area"`

### Task 10: Input, panel level, perakitan halaman, verifikasi akhir

**Files:**
- Create: `ui/Terminal.tsx`, `ui/ButtonBar.tsx`, `ui/FileEditor.tsx`, `ui/LevelPanel.tsx`, `ui/Game.tsx`
- Modify: `app/page.tsx` (hanya merender `<Game />`), `app/layout.tsx` (judul "Belajar Git", `lang="id"`)

**Interfaces:**
- Consumes: `reduce`, `initGame`, `visibleHints`, `isUnlocked`, `LEVELS`, `loadCompleted`, `saveCompleted`, `computeGraphLayout`, `describeEvents` (dipakai via `state.caption`), `GitGraph`, `AreaPanel`, `useEventQueue`.
- Produces: `Terminal({ lines, onSubmit })` (input teks, Enter mengirim, riwayat tergulir otomatis); `ButtonBar({ buttons, onRun })`; `FileEditor({ files, conflicts, onWrite, onResolve })` (pilih/buat file, ubah isi; untuk file di `conflicts` tampil tombol "Pakai versi saya" / "Pakai versi mereka"); `LevelPanel({ level, hints, complete, onReset, onNext, unlocked, onGoto })`; `Game()` merakit tata letak dua kolom dari spec §4 dan menampilkan `caption` di bawah graf dan tombol "Lewati animasi". `Game` memakai `useReducer(reduce, undefined, () => initGame([]))` lalu memuat progres dari `localStorage` dalam `useEffect` setelah mount (menghindari hydration mismatch) dan menyimpan setiap kali `completed` berubah. Mode input per level: `buttons` → hanya ButtonBar; `terminal` → hanya Terminal; `hybrid` → keduanya; FileEditor hanya bila `level.editor`.

- [ ] **Step 1: Implementasi** kelima komponen, perakitan `Game`, dan perubahan `app/page.tsx` / `app/layout.tsx`. Tombol dan terminal mengirim string yang sama ke `dispatch({ type: 'run', input })`.
- [ ] **Step 2: Jalankan pengecekan otomatis.** Run: `npm test && npm run lint && npm run build`. Expected: semua lulus.
- [ ] **Step 3: Verifikasi manual di browser.** Run: `npm run dev`, buka halaman. Mainkan level 1–10 sampai tamat lewat UI (tombol di level 1–5, terminal di 6–10, editor di level 2/5/10). Periksa: node commit muncul dengan animasi, label branch/HEAD bergeser saat `switch` dan `merge`, chip file berpindah Working → Staging → Repository, caption berubah tiap perintah, level terkunci sampai level sebelumnya selesai, petunjuk muncul setelah 2 kegagalan, "Ulangi level" bekerja, muat ulang halaman mempertahankan progres, dan dengan `prefers-reduced-motion: reduce` tidak ada gerakan. Catat dan perbaiki temuan.
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): perakitan game dan halaman utama"`
