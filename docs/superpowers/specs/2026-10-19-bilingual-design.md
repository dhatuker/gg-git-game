# Game Belajar Git — Bilingual (Indonesia / English)

Tanggal: 2026-10-19
Status: disetujui pengguna dalam percakapan; pengguna meminta langsung dikerjakan tanpa review spec tertulis.
Melengkapi: `docs/superpowers/specs/2026-10-19-git-learning-game-design.md`

## 1. Tujuan

Semua teks yang dilihat pemain tersedia dalam Bahasa Indonesia dan English: UI, cerita/tujuan/petunjuk level, pesan ramah dari engine, dan caption graf. Pemain bisa mengganti bahasa kapan saja tanpa kehilangan progres, dan riwayat terminal serta caption ikut berganti bahasa.

Tidak diterjemahkan: pesan asli git (selalu bahasa Inggris, seperti git sungguhan), perintah git, nama branch, nama file, isi file, dan pesan commit.

## 2. Keputusan yang sudah disepakati

- Pemilihan bahasa: tombol **ID | EN** di header. Kunjungan pertama mengikuti bahasa browser (`id` atau `id-*` → ID, selain itu EN). Pilihan disimpan di `localStorage` kunci `gg-git-game:lang`.
- Nama di repo latihan netral untuk kedua bahasa: branch `fitur` → `feature`; `catatan.txt` → `notes.txt`; `ide.txt` → `idea.txt`; isi `README.md` dan pesan commit di state awal level ditulis dalam bahasa Inggris sederhana.
- Mekanisme: i18n buatan sendiri dengan kunci pesan, tanpa dependency baru.

## 3. Arsitektur

### 3.1 Engine: pesan terstruktur

- `engine/messages.ts` mendefinisikan `MessageKey` (union string literal) dan `Msg = { key: MessageKey; params?: Record<string, string | number> }`.
- `OutputLine = Msg | { raw: string }`. `raw` untuk teks yang tidak diterjemahkan: pesan asli git, daftar file di `status`, baris `log`, nama perintah yang disarankan.
- `CommandResult.output: OutputLine[]` (sebelumnya `string`).
- `EditResult.error?: Msg` (sebelumnya `string`).
- Nama event (`repo-dibuat`, dst.) tidak berubah; itu id internal.
- Engine tidak mengimpor apa pun dari `i18n/` atau React.

### 3.2 Kamus

- `i18n/types.ts`: `Lang = "id" | "en"`, `UiKey` (union kunci UI dan caption), `DictKey = MessageKey | UiKey`, `Dict = Record<DictKey, string>`.
- `i18n/id.ts`, `i18n/en.ts`: `Dict`. Template memakai parameter `{nama}`. Kunci yang hilang membuat build gagal.
- `i18n/format.ts`: `translate(lang, key, params?)` dan `formatLine(lang, line)`. Parameter yang tidak tersedia dibiarkan apa adanya (`{x}`) agar mudah terlihat saat pengujian.

### 3.3 State game

- Baris terminal: `{ kind: "input"; text: string } | { kind: "output" | "error"; lines: OutputLine[] }`.
- Caption tidak disimpan sebagai string jadi. `describeEvents(events)` mengembalikan pesan berkunci (`Msg | null`), dan state menyimpan pesan itu (`caption: Msg | null`); teksnya dibentuk saat render sehingga ikut berganti bahasa. Perintah yang gagal tetap mempertahankan caption sebelumnya, seperti sekarang.
- Pesan dari reducer (perintah belum dibuka di level ini) berupa `Msg`.

### 3.4 Level

- `Localized = { id: string; en: string }` untuk `title`, `story`, `goal`, dan setiap elemen `hints`.
- Tetap tepat 3 petunjuk; tes "tidak membocorkan perintah solusi" berlaku untuk kedua bahasa.

### 3.5 UI

- `ui/language.ts`: `detectLang(languages: readonly string[]): Lang`, `loadLang(storage?, languages?)`, `saveLang(lang, storage?)`; semua akses storage dibungkus try/catch; nilai selain `"id"`/`"en"` diabaikan.
- `ui/LanguageProvider.tsx`: context `{ lang, setLang, t }`. Render pertama memakai `"id"` (sama dengan HTML statis); setelah mount, bahasa dari storage/deteksi diterapkan. Akibatnya, setiap kali halaman dimuat dengan bahasa EN (baik dari deteksi browser maupun pilihan tersimpan), teks Indonesia tampil sekilas sampai halaman selesai dimuat — kompromi yang disengaja untuk menghindari hydration mismatch tanpa routing per bahasa. Menghilangkannya sepenuhnya butuh render per bahasa di server (routing `/id`/`/en` atau cookie), yang di luar cakupan.
- Saat bahasa berubah: `document.documentElement.lang` dan `document.title` ("Belajar Git" / "Learn Git") diperbarui.
- Tombol ID | EN di header dengan `aria-pressed`.

## 4. Pengujian

- Kamus: setiap kunci di `id` dan `en` memakai himpunan parameter `{...}` yang sama; tidak ada template kosong.
- Engine: tes mencocokkan kunci pesan, bukan potongan kalimat.
- `translate`/`formatLine`, `detectLang`, `loadLang`/`saveLang` (termasuk storage melempar dan nilai rusak).
- Level: semua teks `Localized` tidak kosong di kedua bahasa; petunjuk tidak membocorkan solusi di kedua bahasa.
- Browser: tamatkan 10 level dalam mode EN; ganti bahasa di tengah level dan pastikan riwayat terminal serta caption berganti; pilihan bahasa bertahan setelah reload; tanpa error console.

## 5. Di luar cakupan

Bahasa ketiga, routing per bahasa (`/id`, `/en`), terjemahan metadata SEO statis.
