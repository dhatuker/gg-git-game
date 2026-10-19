# Locale Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/id` dan `/en` dirender statis dalam bahasanya, `/` dialihkan oleh proxy, dan ganti bahasa membawa state level yang sedang dimainkan.

**Architecture:** Root layout pindah ke `app/[lang]/layout.tsx`. Fungsi murni `pickLang` (negosiasi bahasa) dipakai `proxy.ts`. `ui/carry.ts` menyimpan/memulihkan `GameState` lewat `sessionStorage`. `LanguageProvider` menerima `lang` dari rute.

**Tech Stack:** Next.js 16.4.2 (proxy, `generateStaticParams`, `cacheComponents` aktif), React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-locale-routing-design.md`

## Global Constraints

- Cookie: `gg-lang`, nilai `id`/`en`, `Path=/`, `Max-Age=31536000`, `SameSite=Lax`.
- Kunci `sessionStorage`: `gg-git-game:carry`; sekali pakai (dihapus saat dibaca).
- Bahasa default bila tidak ada petunjuk: `en`.
- Tidak memakai `dynamicParams` (tidak kompatibel dengan `cacheComponents`).
- Semua akses storage dibungkus try/catch.
- Commit tanpa baris `Co-Authored-By`.

## Review Focus

1. `Accept-Language` dengan bobot campuran (`en-US,en;q=0.9,id;q=0.8`) → `en`, bukan `id` (Task 1).
2. Cookie bernilai rusak (`fr`, kosong) → diabaikan, pakai header (Task 1).
3. State bawaan rusak atau dari versi lama (bentuk berbeda) → diabaikan tanpa crash (Task 2).
4. Membuka `/en` langsung (tanpa lewat `/`) di browser berbahasa Indonesia → tetap EN, karena URL adalah sumber kebenaran (Task 3).
5. Jalur selain `/` (aset `_next`, favicon) tidak dialihkan proxy (Task 3).

---

### Task 1: Negosiasi bahasa (`pickLang`)

**Files:** Create `i18n/negotiate.ts`; Test `i18n/__tests__/negotiate.test.ts`.

**Interfaces:** Produces `LANG_COOKIE = "gg-lang"`; `isLang(v: unknown): v is Lang`; `parseAcceptLanguage(header: string | null | undefined): string[]` (tag terurut menurut `q` menurun, urutan asli untuk `q` sama, `q=0` dibuang); `pickLang(cookie: string | undefined, acceptLanguage: string | null | undefined): Lang`.

- [ ] Tes gagal: `pickLang("en","id-ID")`→`en`; `pickLang("fr","id-ID")`→`id`; `pickLang(undefined,"en-US,en;q=0.9,id;q=0.8")`→`en`; `"id-ID,id;q=0.9,en;q=0.8"`→`id`; `"fr-FR,id;q=0.5"`→`id`; `"ID"`→`id`; `""`/`null`/`"*"`/`"de"`→`en`; `"en;q=0,id"`→`id`.
- [ ] `npx vitest run i18n` → FAIL; implementasi; → PASS; commit `feat(i18n): negosiasi bahasa untuk proxy`.

### Task 2: Membawa state antar bahasa (`carry`)

**Files:** Create `ui/carry.ts`; Modify `ui/game-state.ts` (aksi `{ type: "restore"; state: GameState }`); Test `ui/__tests__/carry.test.ts`, `ui/__tests__/game-state.test.ts`.

**Interfaces:** Produces `CARRY_KEY = "gg-git-game:carry"`; `saveCarry(state: GameState, storage?: Pick<Storage,"setItem">): void`; `takeCarry(storage?: Pick<Storage,"getItem"|"removeItem">): GameState | null` (validasi: objek, `levelIndex` bilangan bulat dalam jangkauan `LEVELS`, `repo` objek dengan `files`/`index`/`commits`/`branches` objek dan `head` objek, `completed`/`ran`/`lines` array, `hintsRevealed`/`failedAttempts`/`failedSinceHint` angka, `levelComplete` boolean; `events` dikosongkan saat dipulihkan).

- [ ] Tes gagal: bolak-balik setelah beberapa perintah menghasilkan state setara (dengan `events: []`); pembacaan kedua → `null`; JSON rusak, `levelIndex` 99, `repo` hilang → `null` dan kunci terhapus; storage melempar → `null`/tidak melempar; reducer `restore` mengganti state.
- [ ] FAIL → implementasi → PASS; commit `feat(ui): bawa state level saat ganti bahasa`.

### Task 3: Rute `/[lang]`, proxy, dan provider

**Files:** Create `app/[lang]/layout.tsx`, `app/[lang]/page.tsx`, `proxy.ts`; Delete `app/layout.tsx`, `app/page.tsx`; Modify `ui/LanguageProvider.tsx` (prop `lang`, `setLang` = cookie + `saveCarry` lewat callback + `location.assign`), `ui/LanguageToggle.tsx`, `ui/Game.tsx` (prop `lang`, pulihkan carry saat mount sebelum progres), `ui/language.ts` (hapus `loadLang`/`saveLang`/`detectLang` bila tidak terpakai) dan tesnya; Test `proxy` di `i18n/__tests__/proxy.test.ts` (atau `__tests__/proxy.test.ts` di root).

**Interfaces:** `app/[lang]/layout.tsx`: `generateStaticParams()` → `[{lang:"id"},{lang:"en"}]`; `generateMetadata` → `title` dari `translate(lang,"ui.appTitle")`; `notFound()` bila bukan `id`/`en`. `proxy(request: NextRequest)`; `config.matcher = ["/"]`.

- [ ] Baca `node_modules/next/dist/docs` untuk `proxy`, `generateStaticParams`, `generateMetadata`, `not-found` (AGENTS.md).
- [ ] Tes gagal proxy: `/` + cookie `gg-lang=id` → 307 ke `/id`; `/` + `Accept-Language: en-US` → `/en`.
- [ ] Implementasi; `npm test && npx tsc --noEmit && npm run lint && npm run build` → lulus, output build menunjukkan `/id` dan `/en` diprerender.
- [ ] Commit `feat: routing /id dan /en dengan proxy dan state yang dibawa`.

### Task 4: Verifikasi browser

- [ ] `curl -s localhost:3100/en` memuat `Learn Git` dan `lang="en"`; `/id` memuat `Belajar Git`; `/` dengan `Accept-Language: id` → 307 `/id`; `/fr` → 404.
- [ ] Playwright: 10 level dalam EN; di tengah konflik level 10 tekan ID → URL `/id`, repo/terminal/caption/petunjuk tetap; kembali ke EN; reload `/` mengikuti cookie; tanpa error console; 390px tanpa scroll horizontal.
