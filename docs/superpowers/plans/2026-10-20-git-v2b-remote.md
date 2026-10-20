# gg-git-game v2B (remote) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah `clone`, `fetch`, `pull`, `push`, dan `remote -v` ke mini git engine, dengan remote tersimulasi di dalam state, tampilan `origin/main` dan kotak Remote, serta level 18–21.

**Architecture:** `RepoState` bertambah `remote` (repo origin berisi commit dan pointer branch) dan `remoteRefs` (branch pelacak lokal). `push`/`fetch` menyalin objek commit antar dua sisi lalu menggeser pointer; commit tidak pernah dihapus. `pull` = `fetch` + merge lewat fungsi bersama `mergeCommit` yang diekstrak dari `merge`. UI menambah label graf, kotak Remote, dan caption untuk empat event baru.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest (sama dengan 2A).

**Spec:** `docs/superpowers/specs/2026-10-20-git-v2b-remote-design.md` (spec adalah otoritas; bila plan dan spec berselisih, spec menang. Dua penyempurnaan yang dibuat di plan ini dimasukkan ke spec pada Task 1: `createCommit` menghitung `seq` dari gabungan commit lokal dan remote, dan revisi `origin/main` hanya bentuk polos tanpa `~N`).

## Global Constraints

- `engine/` dan `levels/` tidak boleh mengimpor apa pun dari `next` atau `react`. Engine tidak pernah melempar exception ke UI: kegagalan dikembalikan lewat `failure(...)` dengan `ok: false` dan state **tidak berubah** (objek state yang sama).
- Engine tidak pernah menghapus commit dari `state.commits` maupun `remote.commits`; `push`/`fetch` hanya menambah.
- Setiap pesan baru wajib ada di `id` dan `en` dengan set `{param}` identik; dictionary test tetap lolos.
- Format pesan engine: pesan berkunci di baris pertama, pesan asli git (`raw`) di bawahnya.
- URL remote level: `https://github.com/gg-team/taskboard.git`. `pull`/`push` hanya untuk branch `main`; argumen opsional hanya `origin` dan `main`.
- Level memakai pola level 11–17: tiga petunjuk bertingkat id+en tanpa solusi utuh, tes kebocoran petunjuk, paritas id/en, dan "belum selesai di state awal".
- Commit git: gaya `feat:`/`fix:`/`test:`, **tanpa baris `Co-Authored-By`**. Pekerjaan memakai TDD (tes gagal dulu).
- Push langsung ke `origin main` setelah tiap task disetujui sudah diizinkan pemilik; Vercel men-deploy otomatis.

## Review Focus

Masukan yang disiratkan spec tetapi paling mungkin menggigit pemain, tiap baris punya tes di task pemiliknya:

1. `push` saat remote punya commit yang belum di-fetch dibedakan dari yang sudah di-fetch (`fetch first` vs `non-fast-forward`); state tak berubah pada penolakan (Task 4).
2. `pull` dengan perubahan belum di-commit atau file tak terlacak yang akan tertimpa: ditolak, state tak berubah (Task 5).
3. Level 1–17 (`remote: null`) dan save lama tanpa `remote`/`remoteRefs`: `fetch`/`pull`/`push`/`remote` memberi pesan ramah dan tidak crash; `carry` menormalkan bentuk rusak (Task 1, 3, 4).
4. `clone` dua kali atau dengan URL salah; perintah remote saat merge atau rebase berjalan (Task 3, 5).
5. `pull` yang berkonflik lalu `resolve` + `add` + `commit` menghasilkan merge commit berinduk `origin/main` (Task 5).
6. `push`/`pull` saat HEAD terlepas atau bukan di `main`: ditolak dengan pesan jelas (Task 4, 5).

---

### Task 1: Fondasi state remote

**Files:**
- Modify: `engine/types.ts`, `engine/state.ts`, `engine/commands/commit.ts` (hanya `createCommit`), `engine/revision.ts`, `ui/carry.ts`, `docs/superpowers/specs/2026-10-20-git-v2b-remote-design.md`
- Test: `engine/__tests__/helpers.ts` (tambah helper), `engine/__tests__/remote-state.test.ts` (baru), `engine/__tests__/revision.test.ts`, `ui/__tests__/carry.test.ts`

**Interfaces:**
- Produces di `engine/types.ts`: `interface RemoteState { url: string; connected: boolean; branches: Record<string,string>; commits: Record<string,Commit> }`; `RepoState` bertambah `remote: RemoteState | null` dan `remoteRefs: Record<string,string>`. `createEmptyRepo` mengisi `remote: null, remoteRefs: {}`.
- Produces di `engine/state.ts`: `connectedRemote(state: RepoState): RemoteState | null` (non-null hanya bila `remote?.connected`).
- Produces di `engine/revision.ts`: `resolveRef(state: RepoState, name: string): string | undefined` — branch lokal dulu, lalu `origin/<b>` bila `remoteRefs[b]` ada. `resolveRevision` memakainya untuk nama polos (tanpa `~`/`^`).
- Produces di `engine/__tests__/helpers.ts`: `attachRemote(state: RepoState, url?: string): RepoState` (remote terhubung berisi salinan `state.commits`, `branches.main` dan `remoteRefs.main` = ujung `main` lokal) dan `teammateCommit(state: RepoState, file: string, content: string, message: string): RepoState` (menambah satu commit di ujung remote saja, memakai `seq` lanjutan; tidak menyentuh state lokal selain `remote`).

- [ ] **Step 1: Tulis tes yang gagal** — `remote-state.test.ts`: (a) `createEmptyRepo()` punya `remote === null` dan `remoteRefs` kosong; (b) `connectedRemote` null untuk `remote: null` dan untuk `connected: false`, objek remote untuk terhubung; (c) `unreachableCommits` tidak menganggap commit yang hanya ditunjuk `remoteRefs.main` sebagai yatim, tetapi menganggapnya yatim bila `remoteRefs` kosong; (d) `createCommit` memakai `seq` = max seq lokal **dan** remote + 1 (setelah `teammateCommit`, commit lokal baru bersekuens lebih besar daripada commit teman). `revision.test.ts`: `resolveRevision(s, "origin/main")` mengembalikan ujung `remoteRefs.main`; nama branch lokal bernama `origin/x` menang atas remote; `origin/missing` memberi `revision.unknown`. `carry.test.ts`: simpanan tanpa `remote`/`remoteRefs` dimuat dengan `null`/`{}`; `remote` bertipe string atau `remoteRefs` bertipe array dinormalkan ke `null`/`{}`.
- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/remote-state.test.ts engine/__tests__/revision.test.ts ui/__tests__/carry.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** tipe, `createEmptyRepo`, `connectedRemote`, `unreachableCommits` (tambahkan nilai `remoteRefs` sebagai root), `createCommit` (seq dari gabungan `state.commits` dan `state.remote?.commits`), `resolveRef`, `resolveRevision`, normalisasi `carry` (objek polos saja), dan helper tes. Perbarui spec: §2 menyebut seq dari gabungan commit lokal dan remote, dan §2 `resolveRef` tidak menyebut `origin/main~1`. Perbaiki semua literal `RepoState` lain yang gagal `tsc` (cari `rebaseState: null`).
- [ ] **Step 4: Jalankan** `npm test` dan `npx tsc --noEmit`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: add remote state, remote refs and resolveRef`

---

### Task 2: `mergeCommit` bersama; `merge` dan `rebase` menerima `origin/main`

**Files:**
- Modify: `engine/commands/merge.ts`, `engine/commands/rebase.ts`
- Test: `engine/__tests__/merge.test.ts`, `engine/__tests__/rebase.test.ts` (tambah; tes lama tidak diubah)

**Interfaces:**
- Consumes: `resolveRef`, `attachRemote`, `teammateCommit` (Task 1).
- Produces di `engine/commands/merge.ts`: `mergeCommit(state: RepoState, targetId: string, label: string, mergeMessage: string): CommandResult` — seluruh logika merge dari "sudah terbaru" sampai merge commit/konflik, memakai `label` untuk pesan dan `mergeState.from`. `merge` memanggilnya. Pesan merge commit: `Merge branch '<t>'` untuk branch lokal, `Merge remote-tracking branch '<t>'` bila target berawalan `origin/`.

- [ ] **Step 1: Tulis tes yang gagal**: `git merge origin/main` fast-forward bila `main` tertinggal (event `merge-fast-forward`, `branches.main` = `remoteRefs.main`); membuat merge commit berpesan `Merge remote-tracking branch 'origin/main'` saat bercabang; konflik menyimpan `mergeState.from === "origin/main"` dan `fromCommit` = ujung `origin/main`; `git rebase origin/main` memindahkan commit lokal ke atas `origin/main`; `git merge origin/missing` tetap `merge.notFound`; `git switch origin/main` dan `git branch -d origin/main` gagal tanpa mengubah state.
- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/merge.test.ts engine/__tests__/rebase.test.ts`. Harapan: tes baru FAIL.
- [ ] **Step 3: Implementasi**: ekstrak `mergeCommit` (hanya memindahkan kode); `merge` dan `rebase` mencari target dengan `resolveRef` (rebase tetap menolak target sama dengan branch aktif). Perilaku dan pesan `merge` untuk branch lokal tidak berubah.
- [ ] **Step 4: Jalankan** `npm test`. Harapan: seluruh tes lama PASS tanpa diubah.
- [ ] **Step 5: Commit** `feat: extract mergeCommit and accept origin refs in merge and rebase`

---

### Task 3: `clone`, `remote`, dan guard perintah

**Files:**
- Create: `engine/commands/clone.ts`, `engine/commands/remote.ts`
- Modify: `engine/index.ts`, `engine/suggest.ts`, `engine/types.ts` (event `clone-selesai`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/clone-remote.test.ts` (baru)

**Interfaces:**
- Consumes: `connectedRemote`, `remoteRefs` (Task 1).
- Produces: handler `clone` dan `remote` terdaftar di `HANDLERS`; `runCommand` mengizinkan `clone` pada repo belum diinisialisasi. Event `{ type: "clone-selesai"; tip: string }`. Kunci pesan: `clone.alreadyInit`, `clone.notFound` (param `url`), `clone.needUrl`, `clone.badArgs`, `clone.done` (param `url`), `remote.none`, `remote.unsupported` (param `sub`). `KNOWN_COMMANDS` memuat `clone`, `fetch`, `pull`, `push`, `remote`.

- [ ] **Step 1: Tulis tes yang gagal**: clone sukses dari `createEmptyRepo()` + remote tak terhubung (`initialized`, `branches.main` = `remoteRefs.main` = ujung remote, `commits` = semua commit remote, `files` dan `index` = snapshot ujung, `head` di `main`, `remote.connected`, event `clone-selesai`, kunci `clone.done`); URL dengan dan tanpa akhiran `.git` diterima; URL lain, `remote === null`, tanpa argumen, dan argumen kedua (nama folder) gagal dengan state yang sama (`toBe`); clone pada repo yang sudah `initialized` → `clone.alreadyInit`; `remote -v` mencetak dua baris raw (`origin <url> (fetch)`, `(push)`) saat terhubung dan tidak mencetak apa pun saat tidak; `remote` polos mencetak `origin`; `remote add x y` → `remote.unsupported`; `git fetch` pada `createEmptyRepo()` tetap `repo.notInitialized`.
- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/clone-remote.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** kedua handler, daftar di `HANDLERS` (juga `fetch`/`pull`/`push` belum — hanya `clone` dan `remote` di task ini), guard `runCommand` (`name !== "init" && name !== "clone"`), suggest, dan semua kunci pesan id+en.
- [ ] **Step 4: Jalankan** `npm test` dan `npx tsc --noEmit`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: add git clone and git remote`

---

### Task 4: `fetch` dan `push`

**Files:**
- Create: `engine/commands/transfer.ts` (penyalin commit bersama), `engine/commands/fetch.ts`, `engine/commands/push.ts`
- Modify: `engine/index.ts`, `engine/types.ts` (event `fetch-selesai`, `push-berhasil`, `push-ditolak`), `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/fetch-push.test.ts` (baru)

**Interfaces:**
- Consumes: `connectedRemote`, `attachRemote`, `teammateCommit`, `isReachable`, `inProgressBlock`.
- Produces di `transfer.ts`: `copyMissing(source: Record<string,Commit>, target: Record<string,Commit>, tip: string): Record<string,Commit>` — salinan `target` ditambah seluruh leluhur `tip` dari `source` yang belum ada (tidak mengubah argumen).
- Event: `{ type: "fetch-selesai"; from: string; to: string }`, `{ type: "push-berhasil"; from: string; to: string; count: number }`, `{ type: "push-ditolak"; reason: "fetch-first" | "non-fast-forward" }`.
- Kunci pesan: `fetch.noRemote`, `fetch.upToDate`, `fetch.done`, `fetch.badFlag`, `push.noRemote`, `push.onlyMain`, `push.noCommits`, `push.upToDate`, `push.done`, `push.rejected` (param `reason`: `fetch-first`/`non-fast-forward`), `push.badFlag`. Ditambah `remote.noRepo` untuk `fetch`/`push` bila tidak terhubung (`fatal: 'origin' does not appear to be a git repository`).

- [ ] **Step 1: Tulis tes yang gagal**: `copyMissing` (menyalin tepat commit yang belum ada, tidak mengubah argumen); `fetch`: menyalin commit teman ke `state.commits`, menggeser `remoteRefs.main`, tidak menyentuh `branches`, `files`, `index`, event `fetch-selesai`; tanpa yang baru → `fetch.upToDate` tanpa event; tidak terhubung dan `remote: null` → pesan ramah, state sama; flag `--all`/`-p` → `fetch.badFlag`; ditolak saat merge/rebase berjalan. `push`: fast-forward menyalin tepat commit lokal yang belum ada di remote, `remote.branches.main` = `remoteRefs.main` = ujung lokal, event `push-berhasil {count}`; sama persis → `push.upToDate`; **remote punya commit yang belum di-fetch → ditolak `fetch-first`**; **sudah di-fetch tetapi bercabang → ditolak `non-fast-forward`**; kedua penolakan: `ok: false`, state `toBe` sama, event kosong, raw `! [rejected] main -> main (fetch first)` / `(non-fast-forward)`; `git push origin main` diterima; `git push origin feature`, HEAD terlepas, dan HEAD di branch selain `main` → `push.onlyMain`; `--force`, `-f`, `-u` → `push.badFlag`; belum ada commit → `push.noCommits`; `remote: null` → `remote.noRepo`.
- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/fetch-push.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** semua modul dan kunci pesan id+en; daftar `fetch` dan `push` di `HANDLERS`. Aturan: penolakan `fetch-first` bila `remote.branches.main` tidak ada di `state.commits`; `non-fast-forward` bila ada tetapi bukan leluhur ujung lokal.
- [ ] **Step 4: Jalankan** `npm test` dan `npx tsc --noEmit`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: add git fetch and git push`

---

### Task 5: `pull` dan baris pelacakan di `status`

**Files:**
- Create: `engine/commands/pull.ts`
- Modify: `engine/commands/status.ts`, `engine/index.ts`, `engine/messages.ts`, `i18n/{id,en}/engine.ts`
- Test: `engine/__tests__/pull.test.ts` (baru), `engine/__tests__/status-add.test.ts` (tambah)

**Interfaces:**
- Consumes: `mergeCommit` (Task 2), `copyMissing` dan event `fetch-selesai` (Task 4), `inProgressBlock`.
- Produces: handler `pull`. Kunci pesan: `pull.noRemote`, `pull.onlyMain`, `pull.badFlag`, `pull.noCommits`, `status.trackingUpToDate`, `status.trackingAhead` (param `n`), `status.trackingBehind` (param `n`), `status.trackingDiverged` (param `ahead`, `behind`). Pesan merge commit pull: `Merge branch 'main' of <url>`.

- [ ] **Step 1: Tulis tes yang gagal**: `pull` menyalin commit teman lalu fast-forward saat lokal tertinggal (event `fetch-selesai` lalu `merge-fast-forward`); membuat merge commit berinduk [ujung lokal, `origin/main`] dan berpesan `Merge branch 'main' of <url>` saat bercabang; "Already up to date." tanpa perubahan bila sudah terbaru; **konflik**: `mergeState.from === "origin/main"`, lalu `resolveConflict` + `git add` + `git commit -m` selesai menjadi merge commit berinduk `origin/main` dan `mergeState` null; `main` yang tertinggal karena `fetch` manual sebelumnya tetap disatukan; **perubahan belum di-commit → ditolak `state.dirty`, state `toBe` sama**; **file tak terlacak yang akan tertimpa → ditolak**, state sama; ditolak saat merge/rebase berjalan; HEAD terlepas / bukan di `main` / `origin feature` → `pull.onlyMain`; `--rebase` dan `--ff-only` → `pull.badFlag`; `remote: null` → `remote.noRepo`. `status`: baris pelacakan tepat setelah baris branch dan sebelum baris rebase untuk up to date / ahead 2 / behind 1 / diverged (ahead 1, behind 1); tidak muncul bila tidak terhubung atau HEAD bukan di `main`; `status.clean` tetap tercetak saat tree bersih (baris pelacakan dihitung sebagai header).
- [ ] **Step 2: Jalankan** `npx vitest run engine/__tests__/pull.test.ts engine/__tests__/status-add.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** `pull` (fetch internal memakai `copyMissing`, lalu `mergeCommit`), baris pelacakan di `status`, daftar di `HANDLERS`, pesan id+en.
- [ ] **Step 4: Jalankan** `npm test` dan `npx tsc --noEmit`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: add git pull and tracking line in status`

---

### Task 6: UI — label `origin/main`, kotak Remote, caption

**Files:**
- Modify: `ui/layout.ts`, `ui/GitGraph.tsx`, `ui/graph-geometry.ts` (bila label perlu), `ui/AreaPanel.tsx`, `ui/Game.tsx`, `ui/caption.ts`, `ui/highlight.ts`, `app/globals.css`, `i18n/types.ts`, `i18n/{id,en}/ui.ts`
- Test: `ui/__tests__/layout.test.ts`, `ui/__tests__/area-columns.test.ts`, `ui/__tests__/caption.test.ts`, `ui/__tests__/highlight.test.ts`

**Interfaces:**
- Consumes: event dan `RemoteState` (Task 1–4).
- Produces: `GraphLabel.kind` bertambah `"remote"` (nama `origin/main`, `commitId` = `remoteRefs.main`); `computeGraphLayout` mengklaim rantai `remoteRefs` setelah branch lokal. `columns(repo)` mengembalikan juga `remote: Chip[]` — satu chip `origin/main` bila terhubung (`file` = `origin/main`, `note` kosong) dan ringkasan ahead/behind tersedia lewat fungsi baru `remoteSummary(repo): { ahead: number; behind: number; tip: { id: string; message: string } } | null` yang diekspor dari `ui/AreaPanel.tsx` (`behind` dihitung terhadap **ujung remote sebenarnya**, bukan hanya `remoteRefs`, supaya commit teman terlihat sebelum `fetch`). `AreaPanel` menerima `showRemote: boolean` (dari `allowedCommands.includes("push")`). `AreaColumn` bertambah `"remote"`. Kunci UI: `ui.areaRemote`, `ui.areaRemoteDesc`, `ui.areaRemoteEmpty`, `ui.remoteAhead` (param `n`), `ui.remoteBehind` (param `n`), `ui.remoteSynced`, `caption.clone` (param `tip`), `caption.fetch` (params `from`, `to`), `caption.push` (params `count`, `to`), `caption.pushRejectedFetchFirst`, `caption.pushRejectedNonFastForward`.

- [ ] **Step 1: Tulis tes yang gagal**: layout memberi label `origin/main` (`kind: "remote"`) pada commit `remoteRefs.main`, tidak ada label remote saat `remoteRefs` kosong, dan commit yang hanya terjangkau dari `origin/main` mendapat `lane` (tidak melempar); `columns(...).remote` kosong tanpa remote terhubung dan satu chip bila terhubung; `remoteSummary` untuk lokal ahead 1, behind 2 (setelah `teammateCommit` ×2 tanpa fetch), sinkron, dan `null` bila tak terhubung; `describeEvents` memetakan keempat event baru ke kunci yang benar, `push-ditolak` memilih kunci per `reason`; prioritas: `push-berhasil` dan `clone-selesai` tidak kalah oleh `commit-dibuat`; `litColumn`: `push-berhasil` → `remote`, `fetch-selesai` dan `clone-selesai` → `repo`; `highlightTargets` untuk `push-berhasil` menyorot commit `to` dan label `origin/main`, untuk `fetch-selesai` commit `to`.
- [ ] **Step 2: Jalankan** `npx vitest run ui/__tests__`. Harapan: tes baru FAIL.
- [ ] **Step 3: Implementasi** semua perubahan di atas. CSS: `.gg-label-remote` (garis putus-putus atau warna sekunder, ditumpuk bila satu commit dengan `main`), kotak Remote di `.gg-areas` mendukung hingga lima kotak (satu baris di layar lebar, membungkus dengan `auto-fit` di lebar menengah, bertumpuk di bawah 640px) dan kelas label langkah `git push / git pull`. Aturan `prefers-reduced-motion` yang ada sudah mencakup transisi baru; pastikan tidak menambah animasi tanpa perlindungan itu.
- [ ] **Step 4: Jalankan** `npm test`, `npx tsc --noEmit`, `npm run lint`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: draw origin/main, add Remote box and remote captions`

---

### Task 7: `remoteWorld`, level 18 dan 19

**Files:**
- Modify: `levels/history.ts`, `levels/index.ts`, `levels/solve.ts` (bila perlu), `levels/__tests__/solvable.test.ts`, `ui/__tests__/game-state.test.ts` (jumlah level)
- Create: `levels/level-18.ts`, `levels/level-19.ts`
- Test: `levels/__tests__/level-alt-solutions.test.ts` (tambah)

**Interfaces:**
- Consumes: semua perintah remote (Task 3–5), `projectSetup`, `cmd`, `write`, `applySteps`.
- Produces di `levels/history.ts`: `REMOTE_URL = "https://github.com/gg-team/taskboard.git"` dan `remoteWorld(opts: { teammate?: SolutionStep[]; local?: SolutionStep[]; cloned: boolean }): RepoState`. Langkah: bangun `base = projectSetup()`; `teammate` dijalankan pada salinan `base` untuk menghasilkan commit remote; bila `cloned` false, kembalikan `createEmptyRepo()` ber-`remote` tak terhubung berisi seluruh commit remote; bila `cloned` true, kembalikan `base` ber-`remote` terhubung (commit teman sudah ada di `remote.commits` dan `remote.branches.main`), `remoteRefs.main` = ujung `base` (belum di-fetch), lalu jalankan `local` pada state itu (sehingga `seq` commit lokal melanjutkan commit teman, lihat Task 1).
- Level 18 (`id: 18`; judul id "Ambil proyek" / en "Get the project"): `initialState = remoteWorld({ cloned: false })`, `editor: false`, `allowedCommands` = level 17 + `"clone"`. Tujuan: `initialized`, `branches.main === remote.branches.main`, `remoteRefs.main === remote.branches.main`, `files` berisi `index.html`. `solution: [cmd("git clone " + REMOTE_URL)]`. Cerita: proyek tim ada di server; pemain belum punya salinannya.
- Level 19 (`id: 19`; judul id "Kirim pekerjaanmu" / en "Send your work"): `initialState = remoteWorld({ cloned: true, local: [write("notes.txt", "Standup notes")] })`, `allowedCommands` = level 18 + `"push"`, `"remote"`. Tujuan: `remote.branches.main === branches.main`, ujung remote ≠ ujung awal, snapshot ujung remote memuat `notes.txt`. `mustRun: ["push"]`. `solution: [cmd("git add ."), cmd('git commit -m "Add notes"'), cmd("git push")]`.
- Setiap level: tiga petunjuk id+en (konsep → di mana melihat → bentuk perintah tanpa argumen utuh, tidak memuat `git clone <url>` / `git push` utuh bersama argumennya yang lengkap).

- [ ] **Step 1: Tulis tes yang gagal**: `solvable.test.ts` mengharapkan id `[1..19]`; `game-state.test.ts` memakai 19 level; `level-alt-solutions.test.ts`: level 18 tidak selesai di state awal dan selesai dengan `git clone <url>` dan dengan URL tanpa `.git`, tidak selesai dengan URL salah; level 19 selesai dengan `git push origin main`, tidak selesai tanpa commit (hanya `git add .`), dan `git push` sebelum commit tidak memindahkan ujung remote; tes `remoteWorld`: `cloned: true` menghasilkan `remote.commits` ⊇ `commits`, dan commit lokal dari `local` bersekuens lebih besar daripada commit teman.
- [ ] **Step 2: Jalankan** `npx vitest run levels/ ui/__tests__/game-state.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** helper, kedua level, dan daftarkan di `levels/index.ts`. Perbarui tes lama yang mengasumsikan 17 level (cari angka `17` dan `16` pada tes).
- [ ] **Step 4: Jalankan** `npm test`, `npx tsc --noEmit`, `npm run lint`. Harapan: PASS.
- [ ] **Step 5: Commit** `feat: add levels 18-19 (clone, push)`

---

### Task 8: Level 20 dan 21, peta 21 stasiun, verifikasi akhir

**Files:**
- Create: `levels/level-20.ts`, `levels/level-21.ts`
- Modify: `levels/index.ts`, `levels/__tests__/solvable.test.ts`, `ui/__tests__/game-state.test.ts`, `ui/LevelMap.tsx` (hanya bila 21 stasiun butuh penyesuaian)
- Test: `levels/__tests__/level-alt-solutions.test.ts` (tambah)

**Interfaces:**
- Consumes: `remoteWorld`, `idByMessage`, `isReachable`.
- Level 20 (`id: 20`; judul id "Ambil kabar terbaru" / en "Catch up"): `remoteWorld({ cloned: true, teammate: [write("CONTRIBUTING.md", "Open a pull request for every change.\nRun the tests first."), cmd("git add ."), cmd('git commit -m "Update contributing guide"'), write("README.md", "# Taskboard"), cmd("git add ."), cmd('git commit -m "Update readme title"')] })`; `allowedCommands` = level 19 + `"pull"`, `"fetch"`. Tujuan: `branches.main === remote.branches.main` dan `remoteRefs.main === remote.branches.main`, tanpa commit lokal tambahan. `solution: [cmd("git pull")]`. Cerita: teman sudah mendorong pekerjaan; petunjuk 2 menyebut membandingkan `origin/main` dan `main` di graf dan kotak Remote.
- Level 21 (`id: 21`; judul id "Push ditolak" / en "Push rejected"): `remoteWorld({ cloned: true, teammate: [write("docs.md", "Setup guide"), cmd("git add ."), cmd('git commit -m "Update docs"')], local: [write("search.js", "export function search() {}"), cmd("git add ."), cmd('git commit -m "Add search box"')] })`; `allowedCommands` sama dengan level 20. Tujuan: `remote.branches.main === branches.main`, riwayat remote memuat commit berpesan "Add search box" dan "Update docs", dan ujung remote memuat `search.js` dan `docs.md`. `mustRun: ["push"]`. `solution: [cmd("git pull"), cmd("git push")]` (`applySteps` melempar bila langkah gagal, jadi `push` pertama yang ditolak tidak masuk solusi; cerita menegaskan penolakan itu sebagai pemicu belajar, dan tes memastikan `git push` di state awal memang ditolak).
- Peta: `LevelMap` sudah menggulir horizontal (Task 14 dari 2A); ubah hanya bila 21 stasiun melanggar tes/tampilan.

- [ ] **Step 1: Tulis tes yang gagal**: id `[1..21]`; level 20 selesai dengan `git pull`, dengan `git fetch` lalu `git merge origin/main`, **tidak** selesai dengan `git fetch` saja; level 21: `git push` di state awal ditolak (`ok: false`, state sama), selesai dengan `git pull` lalu `git push`, selesai dengan `git fetch`, `git rebase origin/main`, `git push` (riwayat linear), tidak selesai bila hanya `git pull` tanpa `push`; `game-state` memakai 21 level.
- [ ] **Step 2: Jalankan** `npx vitest run levels/ ui/__tests__/game-state.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** kedua level dan daftarkan. Tulis cerita yang menyebut penolakan `push` sebagai pemicu belajar level 21. Petunjuk tidak memuat `git pull`/`git push` utuh bersama argumen lengkap.
- [ ] **Step 4: Verifikasi penuh**: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Harapan: semua hijau tanpa peringatan tipe.
- [ ] **Step 5: Commit** `feat: add levels 20-21 (pull, rejected push)`
