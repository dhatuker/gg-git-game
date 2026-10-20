# Redesign UX: beranda, peta level, halaman belajar

## Tujuan
Alur yang lebih mudah dipahami: pemain masuk lewat beranda, memilih level di peta yang dikelompokkan menurut kesulitan, lalu belajar di halaman yang tata letaknya tetap sama seperti sebelumnya, dengan rangkuman setelah level selesai.

## Rute
- `/[lang]`: beranda. Demo graf hidup, tombol Mulai/Lanjutkan sesuai progres, ringkasan lima jalur.
- `/[lang]/levels`: peta level. Level dikelompokkan dalam lima jalur (`levels/tiers.ts`): Pemula 1-5, Menengah 6-10, Lanjutan 11-13, Mahir 14-17, Kolaborasi 18-21. Level terkunci sampai level sebelumnya selesai.
- `/[lang]/play/[level]`: halaman belajar. Layout dua kolom tetap; peta stasiun di header diganti bar tipis (kembali ke peta, posisi level, progres jalur, bahasa, rangkuman). Level yang masih terkunci dialihkan ke level terbuka pertama.

## Modal rangkuman
Terbuka sendiri sesaat setelah level selesai, dan bisa dibuka lagi dari tombol Rangkuman.
- Tab "Level ini": yang dipelajari (`levels/summaries.ts`), perintah yang berhasil dipakai, graf akhir, statistik (perintah, gagal, petunjuk).
- Tab "Catatan perintah": semua perintah yang sudah dikenalkan sampai level ini; baris berwarna adalah perintah baru.
- Tombol: ulangi level, ke peta level, level berikutnya.

## Keputusan
- Perintah baru per level dihitung otomatis dari selisih `allowedCommands` antar level, bukan ditulis tangan.
- Progres tetap di localStorage (`gg-git-game:completed`); beranda dan peta membacanya lewat `useSyncExternalStore` agar HTML server dan client cocok.
- Ganti bahasa tetap memuat ulang dokumen penuh (alasan di `ui/Game.tsx`); di halaman belajar state level dibawa lewat `carry`.
- Level 18-21 (remote) membentuk jalur sendiri bernama Kolaborasi karena topiknya berbeda dari tingkat kesulitan lokal.
