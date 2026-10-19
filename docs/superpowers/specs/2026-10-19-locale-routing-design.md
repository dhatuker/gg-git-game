# Routing per bahasa (`/id`, `/en`)

Tanggal: 2026-10-19
Status: disetujui pengguna (opsi A); pengguna meminta langsung dikerjakan.
Melengkapi: `docs/superpowers/specs/2026-10-19-bilingual-design.md` (menggantikan bagian 3.5 tentang pemilihan bahasa di client).

## Tujuan

Halaman langsung dirender dalam bahasa yang benar, sehingga tidak ada lagi kilasan teks Indonesia bagi pemain berbahasa Inggris. URL menunjukkan bahasa dan bisa dibagikan.

## Keputusan

- Rute: `/id` dan `/en`, keduanya di-prerender statis. `app/[lang]/layout.tsx` menjadi root layout (`<html lang={lang}>`, judul tab lewat Metadata API). Bahasa lain (mis. `/fr`) → 404 lewat `notFound()` (opsi `dynamicParams` tidak tersedia dengan `cacheComponents`).
- `/` diarahkan oleh `proxy.ts` (nama baru middleware di Next 16) ke `/id` atau `/en`:
  1. cookie `gg-lang` bila bernilai `id`/`en`;
  2. selain itu header `Accept-Language`: tag dengan bobot `q` tertinggi yang berbahasa `id` atau `en` menang; tidak ada yang cocok → `en`.
- Tombol ID | EN: menyimpan cookie `gg-lang` (path `/`, satu tahun, `SameSite=Lax`), menyimpan state level yang sedang dimainkan ke `sessionStorage` (`gg-git-game:carry`), lalu memuat URL bahasa tujuan. Halaman baru mengambil state itu (sekali pakai) sehingga pemain tetap di posisi yang sama: repo, riwayat terminal, caption, petunjuk terbuka. Karena root layout berganti, Next selalu memuat ulang halaman penuh; ini disengaja.
- State yang dibawa divalidasi; data rusak atau level di luar jangkauan diabaikan (game mulai dari progres tersimpan seperti biasa).
- Preferensi bahasa di `localStorage` (`gg-git-game:lang`) dan deteksi bahasa di client dihapus; server (proxy) yang memutuskan.
- `LanguageProvider` menerima `lang` dari rute, tanpa state atau efek bahasa.

## Konsekuensi

- Butuh server Next (`next start` atau platform yang menjalankan proxy); tidak bisa diekspor sebagai file statis murni.
- Saat halaman dimuat, level 1 tampil sekilas sebelum progres atau state yang dibawa dipulihkan (sama seperti pemuatan progres sebelumnya), tetapi selalu dalam bahasa yang benar.

## Pengujian

- `pickLang(cookie, acceptLanguage)`: cookie valid menang; urutan bobot `q` dihormati; header kosong/`*`/bahasa lain → `en`.
- `proxy`: `/` dialihkan (307) ke `/id` atau `/en` sesuai cookie/header; jalur lain tidak disentuh.
- `saveCarry`/`takeCarry`: bolak-balik, sekali pakai, data rusak/bentuk salah/level di luar jangkauan → `null`, storage yang melempar tidak melempar.
- Reducer: aksi `restore` mengganti state.
- Browser: HTML mentah `/en` sudah berisi "Learn Git" (bukti tanpa kilasan); `/` mengikuti locale/cookie; ganti bahasa di tengah level 10 mempertahankan repo, terminal, caption, petunjuk; `/fr` → 404; tanpa error console.
