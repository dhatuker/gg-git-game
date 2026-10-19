# Bilingual (ID / EN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua teks yang dilihat pemain tersedia dalam Bahasa Indonesia dan English, dengan tombol ID | EN yang mengganti bahasa seketika, termasuk riwayat terminal dan caption.

**Architecture:** Engine mengembalikan pesan berkunci (`Msg`) dan baris mentah (`raw`) alih-alih kalimat jadi. Kamus `i18n/{id,en}` memetakan kunci ke template. State game menyimpan pesan berkunci; UI menerjemahkan saat render lewat context bahasa.

**Tech Stack:** Next.js 16.4.2, React 19.3.0, TypeScript 5, Vitest. Tanpa dependency baru.

**Spec:** `docs/superpowers/specs/2026-10-19-bilingual-design.md` (melengkapi `docs/superpowers/specs/2026-10-19-git-learning-game-design.md`)

## Global Constraints

- Tanpa dependency baru.
- `engine/` tidak mengimpor dari `i18n/`, `ui/`, `react`, atau `next`. `i18n/` boleh mengimpor tipe dari `engine/`.
- Tidak diterjemahkan (selalu `raw`): pesan asli git, baris `log`, daftar file di `status`, daftar branch, baris `[<branch> <id>] <pesan>` hasil commit, perintah git, nama branch/file, isi file, pesan commit.
- Template memakai `{param}`; penggantian satu kali (nilai parameter yang mengandung `{x}` tidak diproses ulang).
- Kunci `localStorage` bahasa: `gg-git-game:lang`; nilai hanya `"id"` atau `"en"`; semua akses dibungkus try/catch.
- Render pertama selalu `"id"` (sama dengan HTML statis); bahasa tersimpan/terdeteksi diterapkan setelah mount.
- Nama netral di repo latihan: `fitur` → `feature`, `catatan.txt` → `notes.txt`, `ide.txt` → `idea.txt`; isi `README.md` dan pesan commit di state awal level dalam bahasa Inggris sederhana.
- Judul tab: `"Belajar Git"` (id) / `"Learn Git"` (en).
- Commit tanpa baris `Co-Authored-By`.

## Review Focus

1. Pesan commit atau nama branch yang mengandung `{...}` tidak boleh ikut diinterpolasi (Task 1: tes `translate` satu kali).
2. `localStorage` berisi bahasa rusak (`"fr"`, JSON, kosong) atau melempar → jatuh ke deteksi browser tanpa crash (Task 5).
3. `navigator.languages` kosong atau berisi variasi huruf besar (`"ID"`, `"id-ID"`) → deteksi tetap benar; kosong → `"en"` (Task 5).
4. Baris `raw` (pesan asli git) identik di kedua bahasa (Task 2: tes `formatLine` untuk raw).
5. Ganti bahasa di tengah level (setelah ada riwayat terminal, caption, dan petunjuk terbuka) → semua ikut berganti tanpa mengubah state repo (Task 6, verifikasi browser).

---

### Task 1: Tipe pesan dan kamus engine

**Files:**
- Create: `engine/messages.ts`, `i18n/types.ts`, `i18n/format.ts`, `i18n/id/engine.ts`, `i18n/en/engine.ts`, `i18n/index.ts`
- Test: `i18n/__tests__/format.test.ts`, `i18n/__tests__/dictionary.test.ts`
- Modify: `vitest.config.ts` hanya bila pola include belum mencakup `i18n/__tests__`

**Interfaces:**
- Produces (`engine/messages.ts`): `type MessageKey` (union di bawah); `type Params = Record<string, string | number>`; `interface Msg { key: MessageKey; params?: Params }`; `type OutputLine = Msg | { raw: string }`; helper `msg(key, params?) : Msg`, `raw(text): { raw: string }`, `isRaw(line): line is { raw: string }`.
- Produces (`i18n/types.ts`): `type Lang = "id" | "en"`; `type UiKey` (awal: kosong/`never`, diperluas Task 4 dan 5); `type DictKey = MessageKey | UiKey`; `interface TMsg { key: DictKey; params?: Params }`; `type TLine = TMsg | { raw: string }`.
- Produces (`i18n/format.ts`): `translate(lang: Lang, key: DictKey, params?: Params): string`; `formatLine(lang: Lang, line: TLine): string`; `formatLines(lang: Lang, lines: TLine[]): string` (gabung dengan `\n`).
- Produces (`i18n/index.ts`): `DICTS: Record<Lang, Record<DictKey, string>>` (gabungan bagian engine dan bagian UI per bahasa).

`MessageKey` (parameter di kurung):
- parse: `parse.unclosedQuote`, `parse.empty`, `parse.notGit`, `parse.missingCommand`
- umum: `repo.notInitialized`, `command.unknown` (cmd), `command.unknownSuggest` (cmd, suggestion), `state.dirty`, `untracked.switch` (files), `untracked.merge` (files), `files.invalidName`, `files.notConflicted` (file)
- init: `init.done`, `init.already`
- status: `status.onBranch` (branch), `status.detached` (id), `status.conflicts`, `status.staged`, `status.unstaged`, `status.untracked`, `status.clean`
- add: `add.nothingSpecified`, `add.missingFile` (file), `add.staged` (files), `add.conflictResolved` (files), `add.conflictsRemain` (files), `add.allConflictsResolved`, `add.nothingNew`
- commit: `commit.needMessage`, `commit.conflictsRemain` (files), `commit.nothingStaged`, `commit.mergeDone`
- log: `log.noCommits`
- branch: `branch.noCommits`, `branch.invalidName` (name), `branch.exists` (name), `branch.created` (name, id), `branch.noneYet`, `branch.deleteNeedsName`, `branch.notFound` (name), `branch.deleteCurrent` (name), `branch.notMerged` (name), `branch.deleted` (name)
- switch: `switch.needTarget`, `switch.mergeInProgress`, `switch.alreadyOn` (branch), `switch.switched` (branch), `switch.detached` (id), `switch.notFound` (target)
- merge: `merge.needTarget`, `merge.inProgress`, `merge.notFound` (branch), `merge.noCommits`, `merge.upToDate` (branch), `merge.fastForward` (branch, to), `merge.conflict` (files), `merge.conflictNext`, `merge.commitCreated` (id)

Isi `id`: salin kalimat Indonesia yang sekarang ada di engine apa adanya (contoh `fitur` diganti `feature`). Isi `en`: padanan bahasa Inggris dengan parameter yang sama.

- [ ] **Step 1: Tulis tes gagal.** `format.test.ts`: `translate("id", "branch.exists", { name: "x" })` memuat `` `x` ``; `translate("en", "branch.exists", { name: "x" })` memuat `already exists`-setara dan `` `x` ``; parameter yang hilang tetap tertulis `{name}`; `translate("en", "branch.exists", { name: "{name}" })` menghasilkan string yang memuat `{name}` tepat sekali (tidak diproses ulang); `formatLine(lang, { raw: "fatal: x" })` sama persis untuk `id` dan `en`. `dictionary.test.ts`: untuk setiap kunci di `DICTS.id`, kunci yang sama ada di `DICTS.en` dan sebaliknya; himpunan nama `{param}` di template `id` sama dengan di `en`; tidak ada template kosong.
- [ ] **Step 2: Jalankan `npx vitest run i18n`.** Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implementasi** file-file di atas. Interpolasi dengan satu `replace(/\{(\w+)\}/g, ...)` pada template.
- [ ] **Step 4: Jalankan `npx vitest run` dan `npx tsc --noEmit`.** Expected: PASS, tanpa error tipe.
- [ ] **Step 5: Commit** — `git commit -m "feat(i18n): tipe pesan berkunci dan kamus engine id/en"`

### Task 2: Engine mengembalikan pesan berkunci

**Files:**
- Modify: `engine/types.ts` (`CommandResult.output: OutputLine[]`), `engine/state.ts` (`success(state, output: OutputLine[], events?)`, `failure(state, message: Msg, gitMessage?: string)` → output `[message, raw(gitMessage)]`), `engine/parse.ts` (`parseInput` mengembalikan `ParsedCommand | { error: Msg }`), `engine/files.ts` (`EditResult.error?: Msg`), `engine/index.ts`, `engine/commands/*.ts`
- Modify tests: `engine/__tests__/*.ts`, `engine/__tests__/helpers.ts`
- Test: tambahan di `engine/__tests__/helpers.ts` + tes kunci di file tes yang ada

**Interfaces:**
- Consumes: Task 1 (`Msg`, `OutputLine`, `msg`, `raw`, `MessageKey`).
- Produces: `CommandResult { state; output: OutputLine[]; events; ok }`; `EditResult { state; error?: Msg }`; `parseInput(input): ParsedCommand | { error: Msg }`. Helpers tes: `keys(r: CommandResult): MessageKey[]`, `rawText(r: CommandResult): string` (baris raw digabung `\n`).
- Baris yang menjadi `raw` (tidak diterjemahkan): pesan asli git; `[<branch> <id>] <pesan>` hasil commit (untuk HEAD terlepas: `[detached HEAD <id>] <pesan>`); setiap baris `log`; daftar branch (`* main`, dan `* (HEAD detached at <id>)`); nama file di `status` (`    <path>`); baris kosong pemisah di `status` menjadi `raw("")`.

- [ ] **Step 1: Ubah tes lebih dulu.** Ganti setiap asersi pada potongan kalimat Indonesia dengan asersi kunci, mis. `expect(keys(r)).toContain("commit.nothingStaged")`; asersi pada pesan asli git dipindah ke `rawText(r)` (mis. `expect(rawText(r)).toContain("did not match any files")`). Tambah tes: `runCommand(s, 'git commit -m "x"')` berhasil menghasilkan baris raw `[main <id>] x`; `git log --oneline` hanya berisi baris raw; `parseInput('git commit -m "x')` → `error.key === "parse.unclosedQuote"`; `writeFile(s, "a b", "x").error?.key === "files.invalidName"`.
- [ ] **Step 2: Jalankan `npx vitest run engine`.** Expected: FAIL (helpers/kunci belum ada).
- [ ] **Step 3: Implementasi** perubahan tipe dan semua titik pesan di engine sesuai daftar kunci Task 1.
- [ ] **Step 4: Jalankan `npx vitest run engine` dan `npx tsc --noEmit`.** Expected: engine PASS. Error tipe di `ui/` dan `levels/` masih boleh ada (diselesaikan Task 3–5); catat di ledger.
- [ ] **Step 5: Commit** — `git commit -m "refactor(engine): output berupa pesan berkunci dan baris raw"`

### Task 3: Level dua bahasa dan nama netral

**Files:**
- Modify: `levels/types.ts`, `levels/level-01.ts` … `levels/level-10.ts`, `levels/solve.ts` (hanya bila memakai nama lama)
- Test: `levels/__tests__/solvable.test.ts`

**Interfaces:**
- Produces: `type Localized = { id: string; en: string }`; `Level.title|story|goal: Localized`; `Level.hints: Localized[]` (tepat 3).

- [ ] **Step 1: Tulis tes gagal.** Di `solvable.test.ts`: setiap `title`, `story`, `goal`, dan setiap hint punya `id` dan `en` tidak kosong; tes "tidak membocorkan perintah solusi" diterapkan pada `hint.id` dan `hint.en`; tidak ada string `fitur`, `catatan.txt`, atau `ide.txt` di `JSON.stringify(level.initialState)` maupun di solusi.
- [ ] **Step 2: Jalankan `npx vitest run levels`.** Expected: FAIL.
- [ ] **Step 3: Implementasi** tipe `Localized`, nama netral (`feature`, `notes.txt`, `idea.txt`, README `# My First Project`, pesan commit awal dalam bahasa Inggris), dan terjemahan English untuk semua teks level. Teks `id` mempertahankan teks sekarang dengan nama yang diganti.
- [ ] **Step 4: Jalankan `npx vitest run levels`.** Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(levels): teks id/en dan nama netral"`

### Task 4: Caption dan state game berkunci

**Files:**
- Create: `i18n/id/ui.ts`, `i18n/en/ui.ts`
- Modify: `i18n/types.ts` (isi `UiKey` untuk caption dan game), `i18n/index.ts`, `ui/caption.ts`, `ui/game-state.ts`
- Test: `ui/__tests__/caption.test.ts`, `ui/__tests__/game-state.test.ts`

**Interfaces:**
- Consumes: Task 1–3.
- Produces: `UiKey` mencakup `caption.repoCreated`, `caption.staged` (files), `caption.commitFirst` (id), `caption.commit` (id, parent), `caption.branchCreated` (name, at), `caption.branchDeleted` (name), `caption.branchSwitched` (from, to), `caption.headDetached` (id), `caption.fastForward` (branch, to), `caption.mergeCommit` (id, p1, p2), `caption.conflict` (files), `caption.conflictResolved`, `caption.readOnly`, `game.notAllowed`.
- `describeEvents(events: GitEvent[]): TMsg | null` (aturan pemilihan sama seperti sekarang; banyak file di-stage → satu `caption.staged` dengan files digabung `", "`).
- `TerminalLine = { kind: "input"; text: string } | { kind: "output" | "error"; lines: TLine[] }`; `GameState.caption: TMsg | null` (gagal → caption lama tetap; sukses tanpa event → `{ key: "caption.readOnly" }`). `EditResult.error` ditampilkan sebagai baris `error` berisi `[error]`.

- [ ] **Step 1: Ubah tes lebih dulu.** `caption.test.ts`: `describeEvents([{type:"merge-fast-forward", branch:"main", to:"a3f9c1e"}])` → `{ key: "caption.fastForward", params: { branch: "main", to: "a3f9c1e" } }`, dan `translate("id", ...)` dari hasil itu persis ``Pointer `main` maju ke commit `a3f9c1e`. Tidak ada commit baru yang dibuat.``; `[]` → `null`. `game-state.test.ts`: perintah yang belum dibuka → baris terakhir `{ kind: "error", lines: [{ key: "game.notAllowed" }] }`; `git status` sukses → `caption.key === "caption.readOnly"`; perintah gagal setelah sukses mempertahankan `caption` sebelumnya; asersi teks lama yang lain diganti asersi kunci.
- [ ] **Step 2: Jalankan `npx vitest run ui`.** Expected: FAIL.
- [ ] **Step 3: Implementasi** kamus UI bagian caption/game (`id` menyalin kalimat sekarang), `describeEvents`, dan perubahan `game-state.ts`.
- [ ] **Step 4: Jalankan `npx vitest run`.** Expected: PASS semua.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): caption dan baris terminal berkunci"`

### Task 5: Bahasa di UI

**Files:**
- Create: `ui/language.ts`, `ui/LanguageProvider.tsx`, `ui/LanguageToggle.tsx`
- Modify: `i18n/types.ts` dan `i18n/{id,en}/ui.ts` (kunci `ui.*`), `ui/Game.tsx`, `ui/LevelPanel.tsx`, `ui/LevelMap.tsx`, `ui/Terminal.tsx`, `ui/FileEditor.tsx`, `ui/AreaPanel.tsx`, `ui/GitGraph.tsx`, `app/globals.css` (gaya tombol bahasa)
- Test: `ui/__tests__/language.test.ts`

**Interfaces:**
- Consumes: Task 1–4.
- Produces (`ui/language.ts`): `LANG_KEY = "gg-git-game:lang"`; `detectLang(languages: readonly string[]): Lang`; `loadLang(storage?: Pick<Storage, "getItem">, languages?: readonly string[]): Lang`; `saveLang(lang: Lang, storage?: Pick<Storage, "setItem">): void`. Default storage `globalThis.localStorage`, default languages `globalThis.navigator?.languages ?? []`.
- Produces (`ui/LanguageProvider.tsx`): `LanguageProvider({ children })`, `useLang(): { lang: Lang; setLang(l: Lang): void; t(key: DictKey, params?: Params): string; tl(text: Localized): string; line(l: TLine): string }`. Render pertama `"id"`; `useEffect` setelah mount memanggil `loadLang()`; `setLang` menyimpan dengan `saveLang`; efek pada `lang` mengisi `document.documentElement.lang` dan `document.title` dari kunci `ui.appTitle`.
- Kunci `ui.*`: semua teks yang sekarang ditulis langsung di komponen (judul, label tombol, aria-label, placeholder, teks kosong, nama kolom area, pesan konflik di editor, teks penyelesaian level, label peta level, "Petunjuk N", label tombol petunjuk dengan parameter `{shown}`/`{total}`, "Level {n} dari 10", `ui.appTitle`, label tombol bahasa).

- [ ] **Step 1: Tulis tes gagal** `language.test.ts`: `detectLang(["id-ID","en"])` → `"id"`; `detectLang(["ID"])` → `"id"`; `detectLang(["en-US"])` → `"en"`; `detectLang([])` → `"en"`; `loadLang` dengan storage `"en"` → `"en"` walau browser `id`; storage `"fr"`, `'{"x":1}'`, `""`, atau storage yang melempar → hasil `detectLang(languages)`; `saveLang` dengan storage yang melempar tidak melempar dan menyimpan `"en"` ke kunci `gg-git-game:lang` pada storage normal.
- [ ] **Step 2: Jalankan `npx vitest run ui/__tests__/language.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implementasi** `language.ts`, provider, toggle (dua tombol `ID` dan `EN` dengan `aria-pressed`, dalam grup ber-`aria-label` dari kamus), lalu ganti semua teks langsung di komponen dengan `t`/`tl`/`line`. `Game` dibungkus `LanguageProvider` (di `ui/Game.tsx` atau `app/page.tsx`).
- [ ] **Step 4: Verifikasi.** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: semua lulus. Run: `grep -nE ">[^<>{}]*[A-Za-z]{3,}[^<>{}]*<" ui/*.tsx`. Expected: tidak ada teks UI langsung yang tersisa (selain yang memang raw).
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): pemilih bahasa ID/EN dan semua teks UI lewat kamus"`

### Task 6: Verifikasi akhir di browser

**Files:** tidak ada perubahan kecuali perbaikan temuan.

- [ ] **Step 1: Pengecekan otomatis.** Run: `npm test && npm run lint && npm run build`. Expected: semua lulus.
- [ ] **Step 2: Browser (build produksi).** Mainkan level 1–10 dalam mode EN dengan mengetik perintah; di tengah level 10 (setelah konflik, dengan petunjuk terbuka dan riwayat terminal) tekan ID lalu EN dan pastikan riwayat terminal, caption, petunjuk, dan panel ikut berganti sementara graf dan isi file tidak berubah; muat ulang dan pastikan bahasa bertahan; browser dengan `locale: "id-ID"` tanpa storage membuka dalam ID, `locale: "en-US"` dalam EN; `document.documentElement.lang` dan `document.title` sesuai; tidak ada error console; tidak ada scroll horizontal di lebar 390px dalam EN.
- [ ] **Step 3: Commit perbaikan bila ada** — `git commit -m "fix: temuan verifikasi bilingual"`
