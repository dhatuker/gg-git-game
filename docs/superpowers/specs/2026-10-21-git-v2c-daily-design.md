# Game Belajar Git — Spesifikasi Desain Versi 2C (perintah harian)

Tanggal: 2026-10-21
Status: menunggu review pengguna
Melanjutkan: `2026-10-20-git-v2a-local-design.md` dan `2026-10-20-git-v2b-remote-design.md` (level 1–21)

## 1. Tujuan dan cakupan

Versi 1 sampai 2B mengajarkan `init` sampai `push`/`pull`, tetapi melewatkan tiga perintah yang paling sering dipakai sehari-hari: melihat perubahan (`git diff`), membuang atau mengeluarkan perubahan dari staging (`git restore`), dan memperbaiki commit terakhir (`git commit --amend`). Versi 2C menambahkan ketiganya beserta empat level baru di posisi 6–9, tepat setelah jalur Pemula, karena materinya hanya butuh pemahaman `add` dan `commit`.

Kriteria sukses: setelah menamatkan level 6–9, pemain bisa memeriksa apa yang berubah sebelum commit (di working directory maupun staging), membuang perubahan yang salah tanpa menyentuh file lain, mengeluarkan file yang tak sengaja di-stage, dan memperbaiki pesan atau isi commit terakhir sambil memahami bahwa commit lama masih ada.

Tidak berubah: mini engine buatan sendiri, terminal simulasi di semua level, 3 petunjuk bertingkat per level yang tidak membocorkan perintah solusi utuh, tujuan dinilai dari state hasil (plus `mustRun` bila perlu), dua bahasa (id dan en), progres di `localStorage`, commit yang tidak terjangkau tetap ada dan digambar pudar.

### 1.1 Di luar cakupan

- `git log --graph` (panel graf sudah menggambar riwayat; opsi ini tetap ditolak dengan pesan opsi tidak didukung).
- Mode sandbox dan tombol hapus progres.
- `diff` antar commit atau branch (`git diff main feature`, `HEAD~1`), `--stat`, `--word-diff`, dan pemecahan hunk dengan 3 baris konteks.
- `restore --source`, `restore --worktree`/`-W`, `-S`, `git checkout -- <file>`, `git rm`, `git mv`, `git add -p`.
- Force push setelah amend.

## 2. Keputusan yang sudah disepakati

- Cakupan 2C: `git diff` (+ `--staged`/`--cached`), `git restore` (+ `--staged`), `git commit --amend` (+ `--no-edit`), dan level barunya.
- Level baru disisipkan sebagai jalur sendiri di posisi 6–9; level lama 6–21 menjadi 10–25.
- Penomoran: id level tetap sama dengan nomornya. File dan id lama digeser, progres tersimpan dipindahkan sekali lewat fungsi migrasi bertes.
- `log --graph` dilewati dulu.

## 3. Engine

### 3.1 State

`RepoState` tidak bertambah field. Ketiga perintah hanya membaca atau mengubah `files`, `index`, `commits`, `branches`, dan `head` yang sudah ada.

### 3.2 Modul baru dan perubahan modul lama

- `engine/linediff.ts`: `diffLines(a, b)` menghitung diff per baris dengan LCS dan mengembalikan daftar `{ op: " " | "-" | "+", text }`. Teks dipecah dengan `split("\n")`; string kosong berarti nol baris. Tidak ada catatan "No newline at end of file".
- `engine/commands/diff.ts`, `engine/commands/restore.ts`: perintah baru, didaftarkan di `HANDLERS` (`engine/index.ts`) dan `KNOWN_COMMANDS` (`engine/suggest.ts`).
- `engine/commands/commit.ts`: cabang `--amend`.
- `engine/flags.ts`: `commit` menjadi `-m`, `-a`, `--amend`, `--no-edit` (nilai: `-m`); `diff`: `--staged`, `--cached`; `restore`: `--staged`.
- `engine/messages.ts`: baris `raw` boleh membawa `style?: "add" | "del" | "meta"` untuk diwarnai terminal. `raw(text, style?)` tetap kompatibel dengan pemanggilan lama.

### 3.3 Perilaku perintah

Semua perintah memakai pola yang ada: `(state, args) -> CommandResult`, tidak melempar exception, pesan berkunci di baris pertama dan pesan asli git (`raw`) di bawahnya.

**`git diff [--staged|--cached] [<file>…]`** (hanya baca; state tidak berubah)

- Tanpa opsi: membandingkan `index` (kiri, `a/`) dengan `files` (kanan, `b/`) untuk setiap file terlacak (ada di `index`) yang isinya berbeda. File tak terlacak tidak ikut, seperti git.
- `--staged`/`--cached`: membandingkan snapshot HEAD (kiri) dengan `index` (kanan). Tanpa commit, HEAD dianggap kosong. File yang belum ada di HEAD tampil sebagai file baru.
- Argumen file membatasi daftar. File yang tidak dikenal sama sekali → error `diff.unknownPath` + `fatal: ambiguous argument '<f>': unknown revision or path not in the working tree.` File tak terlacak yang disebut di mode tanpa opsi → pesan `diff.untracked` (sukses, tanpa diff) yang menyarankan stage lalu `--staged`.
- Bila ada perbedaan: baris pertama `diff.unstaged` atau `diff.staged`, lalu per file, berurutan menurut nama:
  ```
  diff --git a/app.js b/app.js          (meta)
  --- a/app.js                         (meta)
  +++ b/app.js                         (meta)
  @@ -1,2 +1,3 @@                      (meta)
   baris sama
  -baris lama                          (del)
  +baris baru                          (add)
  ```
  File baru: `new file mode 100644` setelah baris `diff --git`, `--- /dev/null`, dan `@@ -0,0 +1,N @@`. Satu hunk per file yang memuat seluruh isi file (file di game pendek). Angka hunk = jumlah baris lama dan baru; nol baris ditulis `-0,0` / `+0,0`.
- Tanpa perbedaan: `diff.noneUnstaged` (bila staging juga sama dengan HEAD), `diff.noneUnstagedButStaged` (bila ada perubahan di staging; menyebut `git diff --staged`), atau `diff.noneStaged` untuk mode `--staged`. Tidak ada baris raw, karena git juga diam.
- Boleh dijalankan saat merge atau rebase berjalan (hanya baca). File konflik tampil apa adanya, dengan penanda konflik.
- Event: `diff-ditampilkan { staged: boolean }` (kosmetik, juga saat tidak ada perbedaan).

**`git restore [--staged] <file…|.>`**

- Tanpa path → error `restore.needPath` + `fatal: you must specify path(s) to restore`.
- Ditolak bila merge atau rebase berjalan (`inProgressBlock`; pesan `merge.inProgress` sudah menyebut `--abort`).
- Tanpa opsi: setiap path harus ada di `index`. `files[p] = index[p]`. `.` berarti semua file terlacak yang berbeda dari index. Path tak terlacak atau tidak ada → error `restore.unknownPath` + `error: pathspec '<p>' did not match any file(s) known to git`, dan state tidak berubah (semua atau tidak sama sekali).
- `--staged`: setiap path harus ada di `index` atau di snapshot HEAD. `index[p] = head[p]`; bila tidak ada di HEAD, `p` dihapus dari `index` (file kembali tak terlacak). `files` tidak disentuh. `.` berarti semua path yang berbeda antara index dan HEAD. Path tidak dikenal → error yang sama.
- Tidak ada yang berubah (path valid tapi isinya sudah sama) → sukses dengan `restore.nothing`.
- Berhasil: `restore.done { files }` atau `restore.unstaged { files }`; tanpa baris raw (git diam).
- Event: `restore-dilakukan { files, staged }`.

**`git commit --amend (-m "<pesan>" | --no-edit) [-a]`**

- Ditolak saat rebase (blok yang sudah ada) dan saat merge berjalan (`inProgressBlock`).
- Tanpa commit → error `commit.amendNothing` + `fatal: You have nothing to amend.`
- Tanpa `-m` dan tanpa `--no-edit` → error `commit.amendNeedsMessage` (git asli membuka editor; game ini tidak).
- `-a` men-stage file terlacak dulu, seperti commit biasa.
- Membuat commit baru lewat `createCommit` dengan parent = parent commit HEAD (merge commit tetap dua parent), snapshot = `index`, pesan = `-m` atau pesan lama untuk `--no-edit`. Pointer branch (atau HEAD yang terlepas) pindah ke commit baru. Commit lama tidak dihapus; ia jadi yatim kecuali masih ditunjuk ref lain (misalnya `origin/main`).
- Boleh walau `index` sama dengan snapshot HEAD (hanya mengganti pesan). `--no-edit` tanpa perubahan apa pun tetap membuat commit baru dengan id baru, seperti git.
- Output: `commit.amended { from, to }` + `[<branch> <id>] <pesan>`.
- Event: file yang di-stage oleh `-a` (`file-di-stage`), lalu `commit-diperbaiki { from, to }`.
- Setelah push, amend membuat `main` dan `origin/main` bercabang; `push` berikutnya ditolak oleh aturan yang sudah ada. Tidak ada perlakuan khusus.
- `--no-edit` tanpa `--amend` diabaikan (pesan tetap wajib lewat `-m`).

## 4. Event, tampilan, dan caption

- `GitEvent` bertambah `diff-ditampilkan`, `restore-dilakukan`, `commit-diperbaiki`.
- `ui/highlight.ts`: `litColumn` menjadi `litColumns(event): Column[]`. `diff-ditampilkan` → Working + Staging (atau Staging + Repository bila `staged`). `restore-dilakukan` → kolom tujuan (Working, atau Staging bila `staged`) dan file-filenya disorot. `commit-diperbaiki` → commit `to` disorot di graf. `AreaPanel` memakai array kolom.
- `ui/caption.ts`: kunci baru `caption.diff`, `caption.diffStaged`, `caption.restore`, `caption.restoreStaged`, `caption.amend` (menyebut commit lama masih ada dan pudar). `diff-ditampilkan` tidak lagi menghasilkan caption "hanya informasi" generik; ia menjelaskan area mana yang dibandingkan.
- `ui/Terminal.tsx`: baris raw dengan `style` diberi kelas `gg-term-add` (hijau), `gg-term-del` (merah), `gg-term-meta` (abu). Warna lewat token baru di `:root` dan versi gelapnya.
- `levels/summaries.ts`: `COMMAND_NOTES` bertambah `diff` dan `restore`; opsi baru otomatis tampil di `git help` dari `COMMAND_FLAGS`.

## 5. Pesan (id dan en)

Engine: `diff.unstaged`, `diff.staged`, `diff.noneUnstaged`, `diff.noneUnstagedButStaged`, `diff.noneStaged`, `diff.untracked`, `diff.unknownPath`, `restore.needPath`, `restore.unknownPath`, `restore.nothing`, `restore.done`, `restore.unstaged`, `commit.amendNothing`, `commit.amendNeedsMessage`, `commit.amended`.
UI: lima kunci caption di §4, nama dan deskripsi jalur baru, `home.linesTitle` menjadi "Enam jalur, dari dasar sampai kerja tim" / "Six paths, from the basics to teamwork".
Test kamus yang ada (kunci dan parameter sama di kedua bahasa) mencakup semuanya.

## 6. Level 6–9 dan jalur baru

Jalur baru di `levels/tiers.ts`, setelah `beginner`:

- `id: "tidy"`, nama "Periksa & rapikan" / "Check & tidy", `what` "Merapikan sebelum dan sesudah commit" / "Tidy up before and after a commit", `sub` "Lihat perubahan, buang yang salah, perbaiki commit terakhir." / "See changes, discard mistakes, fix the last commit.", `from: 6`, `to: 9`, `lane: 5`.
- Warna `--lane-5` baru (terang dan gelap) di `globals.css`. Graf commit tidak terpengaruh karena memakai 5 warna jalurnya sendiri (`LANES = 5`).

Semua level 6–9: `editor: false` (agar `restore` tidak diakali dengan edit manual), 3 petunjuk dari samar ke spesifik tanpa perintah solusi utuh, ringkasan di `SUMMARIES`, solusi di `solution` yang dites oleh `solvable.test.ts`.

| Level | Judul (id / en) | `allowedCommands` tambahan | Keadaan awal | Tujuan (`isGoalReached` + `mustRun`) |
|---|---|---|---|---|
| 6 | Melihat perubahan / Seeing changes | `diff` | Repo dengan beberapa commit. `app.js` berisi perubahan fitur yang benar; `config.js` hanya berisi baris `debug = true` yang tak sengaja. Keduanya belum di-stage. | Ada commit baru di atas commit awal; snapshotnya memuat `app.js` versi baru dan `config.js` versi lama. `mustRun: ["diff"]`. |
| 7 | Membuang perubahan / Discarding changes | `restore` | Repo bersih lalu `style.css` dirusak oleh eksperimen dan `notes.md` berisi catatan baru yang ingin disimpan; keduanya belum di-stage. | `style.css` di working dan staging sama dengan HEAD; `notes.md` di working tetap berbeda dari HEAD; tidak ada commit baru. `mustRun: ["restore"]`. |
| 8 | Keluarkan dari staging / Unstaging a file | — | `app.js` berubah dan `.env` (berisi kata sandi) baru dibuat; keduanya sudah di-stage seperti setelah `git add .`. | Ada commit baru yang memuat `app.js` versi baru dan tidak memuat `.env`; `.env` masih ada di working directory. `mustRun: ["diff", "restore"]`. |
| 9 | Memperbaiki commit terakhir / Fixing the last commit | — | Commit terakhir berpesan `Add lgoin page` dan memuat `login.html`; `login.css` yang seharusnya ikut masih tak terlacak. | Parent HEAD sama dengan parent commit `Add lgoin page`; snapshot HEAD memuat `login.css`; pesan HEAD berbeda dari `Add lgoin page`. |

`allowedCommands` level 6 = level 5 + `diff`; level 7–9 = level 6 + `restore`. Pemain tidak punya `reset` di level 9, jadi satu-satunya cara memenuhi syarat parent adalah `--amend`.

### 6.1 Pergeseran level lama

- `level-06.ts` … `level-21.ts` diganti nama menjadi `level-10.ts` … `level-25.ts`; `id` di dalamnya ikut digeser +4. `levels/index.ts` mengurutkan 25 level.
- `diff` dan `restore` ditambahkan ke `allowedCommands` setiap level 10–25, supaya tetap tersedia dan `newCommands` di rangkuman tetap benar (level 10 tidak memperkenalkan ulang `diff`/`restore`).
- `tiers.ts`: beginner 1–5, tidy 6–9, intermediate 10–14, advanced 15–17, expert 18–21, teamwork 22–25.
- Kunci `SUMMARIES` 6–21 digeser ke 10–25. Teks cerita, petunjuk, atau ringkasan yang menyebut nomor level lain ("level sebelumnya" tetap aman; "level 8" harus dicek) diperbarui.
- Test yang menyebut nomor atau indeks level digeser.

### 6.2 Migrasi progres

- Kunci baru `gg-git-game:completed-v2`; kunci lama `gg-git-game:completed` dibiarkan sebagai cadangan.
- `migrateCompletedV1(ids)`: buang yang bukan bilangan bulat 1–21, petakan `n ≤ 5 → n` dan `n ≥ 6 → n + 4`, buang duplikat, urutkan.
- `ensureMigrated(storage)`: bila v2 belum ada dan v1 ada, tulis hasil migrasi ke v2. Bila v2 sudah ada, tidak melakukan apa pun. Dipanggil oleh `loadCompleted` dan `progressSnapshot` sebelum membaca, jadi beranda, peta level, dan halaman belajar semuanya melihat data yang sudah dimigrasi. `saveCompleted` menulis ke v2. Storage yang tidak tersedia atau melempar tetap aman (data kosong, game jalan).
- Pemain yang sudah menamatkan 1–21 melihat level 1–5 dan 10–25 selesai; level 6 terbuka karena level 5 selesai, dan level 7–9 terbuka berurutan.
- Carry state saat ganti bahasa memakai `levelIndex` dan kedaluwarsa 30 detik, jadi tidak perlu migrasi.
- URL lama (`/play/6`) sekarang membuka level diff. Ini diterima karena game belum punya pemain luas yang menyimpan tautan.

## 7. Pengujian

TDD seperti paket sebelumnya.

- `engine/__tests__/linediff.test.ts`: sama, tambah, hapus, ubah di tengah, string kosong di kedua sisi.
- `engine/__tests__/diff.test.ts`: kedua mode; filter file; file baru (`/dev/null`, `new file mode`); file tak terlacak; path tidak dikenal; ketiga pesan "tidak ada perbedaan"; angka hunk; gaya baris; state tidak berubah; saat konflik.
- `engine/__tests__/restore.test.ts`: working dan `--staged`; `.`; file baru di `--staged` jadi tak terlacak; semua-atau-tidak saat satu path salah; `restore.nothing`; tanpa path; saat merge dan rebase.
- `engine/__tests__/amend.test.ts`: `-m`, `--no-edit`, tanpa pesan, tanpa commit, `-a --amend`, merge commit (dua parent), HEAD terlepas, commit lama yatim, commit lama tetap terjangkau bila ditunjuk `origin/main`, saat merge dan rebase.
- `engine/__tests__/flags.test.ts`: opsi baru diterima; `log --graph` tetap ditolak.
- `ui/__tests__/progress.test.ts`: migrasi v1→v2, idempoten, data rusak, v2 yang sudah ada tidak ditimpa, storage yang melempar.
- `ui/__tests__/highlight.test.ts`, `caption.test.ts`: event baru.
- `levels/__tests__/solvable.test.ts`, `level-alt-solutions.test.ts`, `tiers.test.ts`: otomatis mencakup level 6–9 dan jalur baru; tambah alternatif solusi (misalnya `git diff config.js` di level 6, `git restore --staged .env` lalu `git commit -am` di level 8).
- Terakhir: lint, build, main-coba di browser (desktop dan HP), push ke `main`, cek deploy Vercel.

## 8. Risiko dan keputusan

- **Pergeseran nomor menyentuh banyak file.** Rename dilakukan dengan `git mv` dalam satu commit tersendiri tanpa perubahan isi lain selain `id`, agar diff mudah diperiksa, dan seluruh test harus lolos sebelum level baru ditambahkan.
- **Diff satu hunk berbeda dari git asli untuk file panjang.** File di game hanya beberapa baris, jadi hasilnya sama dengan git untuk kasus yang muncul. Bila kelak ada file panjang, pemecahan hunk bisa ditambahkan di `linediff.ts` tanpa mengubah perintah.
- **Level 6 bisa buntu** bila pemain menjalankan `git add .` (belum ada `restore`). Pemain bisa memakai "Ulangi level"; petunjuk kedua mengingatkan untuk men-stage per file.
- **`mustRun` hanya memeriksa nama perintah**, jadi level 8 tidak bisa memastikan `--staged` dipakai untuk `diff`. Tujuan berbasis state tetap menjamin `.env` keluar dari staging; pemeriksaan `--staged` cukup diarahkan lewat cerita dan petunjuk.
