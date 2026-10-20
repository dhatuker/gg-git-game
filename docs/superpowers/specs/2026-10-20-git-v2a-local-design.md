# Game Belajar Git — Spesifikasi Desain Versi 2A (perintah lokal)

Tanggal: 2026-10-20
Status: menunggu review pengguna
Melanjutkan: `2026-10-19-git-learning-game-design.md` (versi 1, level 1–10)

## 1. Tujuan dan konteks

Versi 1 mengajarkan `init` sampai `merge` dalam 10 level. Versi 2A melanjutkan dengan lima perintah untuk membatalkan, merapikan, dan menyimpan sementara perubahan di repo lokal: `reset`, `revert`, `stash`, `cherry-pick`, dan `rebase`. Perintah remote (`clone`, `push`, `pull`) dipisah menjadi versi 2B dengan spec sendiri.

Kriteria sukses: setelah menamatkan level 11–17, pemain bisa menjelaskan apa yang terjadi pada graf commit saat menjalankan `reset` (soft, mixed, hard), `revert`, `stash`, `cherry-pick`, dan `rebase` (termasuk saat konflik), serta mengapa commit yang "dibuang" sebenarnya masih ada.

Tidak berubah dari versi 1: mini engine buatan sendiri, terminal simulasi di semua level, 3 petunjuk bertingkat per level yang tidak membocorkan perintah solusi utuh, tujuan level dinilai dari state hasil, dua bahasa (id dan en), progres di `localStorage`.

## 2. Keputusan yang sudah disepakati

- Pekerjaan dipecah: 2A (lokal, dokumen ini) dan 2B (remote, spec terpisah).
- Level baru melanjutkan dari level 11 di game yang sama.
- `rebase` mencakup rebase dasar plus konflik (`--continue`, `--abort`). `rebase -i` di luar cakupan.
- Commit yang tidak terjangkau tetap ada di state dan digambar pudar di graf. `reflog` tidak masuk cakupan.

## 3. Engine

### 3.1 State baru

`RepoState` bertambah dua field:

- `stash: StashEntry[]`, dengan `StashEntry = { files, index, baseCommit }`. Hanya menyimpan perubahan file terlacak. Stash bukan commit dan tidak muncul di graf. Elemen 0 adalah stash teratas.
- `rebaseState: RebaseState | null`, dengan `RebaseState = { branch, onto, originalTip, current: string | null, remaining: string[], conflicts: string[] }`. `remaining` berisi id commit asli yang belum disalin, dari yang tertua. `current` adalah id commit asli yang sedang disalin (terisi saat berhenti karena konflik; dipakai `resolveConflict` sebagai sumber "versi mereka"). `onto` adalah ujung target.

Selama rebase berjalan, `head` bertipe detached dan bergerak di commit hasil salinan, seperti git asli. Saat rebase selesai, pointer `branch` dipindah ke ujung baru dan `head` menempel kembali ke branch itu. `createEmptyRepo` mengisi `stash: []` dan `rebaseState: null`.

Engine tidak pernah menghapus commit. `Commit.seq` ikut di-hash (sudah begitu di versi 1), sehingga commit salinan hasil `cherry-pick` dan `rebase` selalu mendapat id berbeda dari aslinya.

### 3.2 Modul baru dan perubahan modul lama

- `engine/revision.ts`: `resolveRevision(state, teks)` mengembalikan id commit atau pesan error berkunci. Bentuk yang dikenali: nama branch, `HEAD`, `HEAD~N`, dan hash (prefix unik, minimal 4 karakter). Bentuk lain (`HEAD^`, `A..B`, `@`) ditolak dengan pesan ramah.
- `engine/threeway.ts`: penggabungan per file (base, ours, theirs) diambil dari `merge.ts` menjadi fungsi `threeWay(base, ours, theirs, labelTheirs)` yang mengembalikan `{ merged, conflictFiles, conflicts }`. Dipakai bersama oleh `merge`, `revert`, `cherry-pick`, dan `rebase`. `merge.ts` dirapikan agar memakainya tanpa mengubah perilaku; semua tes merge yang ada harus lolos tanpa diubah.
- `engine/state.ts`: tambah `unreachableCommits(state)` (commit yang tidak terjangkau dari branch mana pun, HEAD, `mergeState`, atau `rebaseState`) dan `activeConflicts(state)` (daftar konflik dari `mergeState` atau `rebaseState`).
- `add.ts`, `status.ts`, `files.ts` (`resolveConflict`), dan `AreaPanel` membaca konflik lewat `activeConflicts`, dan `add` membersihkan daftar konflik pada state yang aktif. `status` juga menampilkan baris "rebase in progress" selama `rebaseState` aktif.
- `engine/index.ts`: daftarkan `reset`, `revert`, `stash`, `cherry-pick`, `rebase` di `HANDLERS`. `engine/suggest.ts` otomatis mengenali nama baru.

### 3.3 Perilaku perintah

Semua perintah memakai pola yang ada: `(state, args) -> CommandResult`, tidak melempar exception, pesan berkunci di baris pertama dan pesan asli git (`raw`) di bawahnya.

**`reset [--soft|--mixed|--hard] <rev>`**
- Memindahkan pointer branch aktif (atau HEAD yang terlepas) ke `<rev>`.
- `--soft`: index dan working directory tidak disentuh.
- `--mixed` (default): index diganti snapshot target; working directory tidak disentuh.
- `--hard`: index dan working directory diganti snapshot target; file tak terlacak tetap aman (`checkoutSnapshot`).
- Ditolak bila `mergeState` atau `rebaseState` aktif. Tanpa `<rev>` berarti `HEAD`. Tanpa commit sama sekali: error git yang wajar.
- Event: `reset-dilakukan { mode, from, to }`.

**`revert <rev>`**
- Membuat satu commit baru di HEAD yang membalik perubahan commit target (3-way: base = target, ours = HEAD, theirs = parent target). Pesan: `Revert "<pesan target>"`.
- Syarat: working tree bersih (sama seperti `merge`). Commit merge ditolak (tanpa `-m`). Bila ada konflik, ditolak dengan pesan jelas dan state tidak berubah.
- Event: `commit-dibuat`, `revert-dibuat { id, reverted }`.

**`cherry-pick <rev>`**
- Menerapkan perubahan satu commit (base = parent commit itu, theirs = commit itu) ke HEAD sebagai commit baru berpesan sama dan satu parent.
- Syarat sama dengan `revert`: working tree bersih, commit merge ditolak, konflik ditolak tanpa mengubah state. Bila perubahannya sudah ada di HEAD, pesan "tidak ada yang perlu diterapkan".
- Event: `commit-dibuat`, `cherry-pick-dibuat { id, source }`.

**`stash` / `stash push`, `stash pop`, `stash list`**
- `push`: menyimpan perubahan file terlacak (staging dan working) lalu mengembalikan index dan files ke snapshot HEAD, file tak terlacak tetap. Tanpa perubahan: "No local changes to save".
- `pop`: menerapkan stash teratas sebagai perubahan belum di-stage lalu membuangnya. Ditolak (stash dipertahankan) bila file yang sama sedang berubah di working directory. Stash kosong: error yang wajar.
- `list`: satu baris per stash, `stash@{0}: WIP on <branch>: <hash> <pesan>`.
- Subperintah lain (`apply`, `drop`, `-u`) ditolak dengan pesan "belum tersedia di game ini".
- Event: `stash-disimpan`, `stash-dipulihkan`.

**`rebase <branch>`, `rebase --continue`, `rebase --abort`**
- `rebase <branch>`: menghitung commit milik branch aktif yang tidak terjangkau dari target (urut dari tertua), lalu menyalinnya satu per satu di atas ujung target dengan `threeWay`. Setiap salinan memakai pesan asli dan mendapat id baru.
  - HEAD sudah terjangkau dari target: fast-forward pointer branch.
  - Target sudah terjangkau dari HEAD: "up to date".
  - Syarat: working tree bersih, tidak sedang dalam merge atau rebase.
  - Selesai tanpa konflik: pointer branch pindah ke ujung baru, HEAD kembali menempel ke branch. Event: `rebase-commit-disalin { from, to }` per commit, lalu `rebase-selesai { branch, tip }`.
  - Konflik: berhenti di commit itu. File konflik berisi penanda; `rebaseState.conflicts` terisi; event `konflik-terjadi`.
- `--continue`: ditolak bila konflik masih ada atau tidak sedang rebase. Membuat commit dari index dengan pesan commit asli, lanjut menyalin sisanya (bisa berhenti lagi), lalu menyelesaikan seperti di atas.
- `--abort`: mengembalikan branch dan HEAD ke `originalTip`, mengosongkan `rebaseState`, mengembalikan working directory dan index ke snapshot tersebut. Commit salinan menjadi yatim. Event: `rebase-dibatalkan`.
- Selama `rebaseState` aktif, `commit`, `switch`/`checkout`, `merge`, `reset`, `revert`, `cherry-pick`, `stash`, dan `rebase <branch>` ditolak dengan petunjuk memakai `--continue` atau `--abort`.
- Arti "versi saya/mereka" di editor mengikuti git asli: "saya" adalah dasar baru (`HEAD`), "mereka" adalah commit yang sedang disalin. `resolveConflict` memilih sumber sesuai state aktif, dan UI menampilkan keterangan singkat.

### 3.4 Event

Ditambahkan ke `GitEvent`: `reset-dilakukan`, `revert-dibuat`, `cherry-pick-dibuat`, `stash-disimpan`, `stash-dipulihkan`, `rebase-commit-disalin`, `rebase-selesai`, `rebase-dibatalkan`. `konflik-terjadi` dan `konflik-selesai` dipakai ulang.

### 3.5 Pesan

Setiap pesan baru (error, caption, keterangan UI, teks level) dibuat dua bahasa di `i18n/id` dan `i18n/en`, mengikuti sistem pesan berkunci yang ada. Tes paritas kamus yang ada harus tetap lolos.

## 4. Visualisasi

### 4.1 Graf

- `GraphNode` mendapat `orphan: boolean` dari `unreachableCommits`. Node yatim digambar pudar dengan garis putus-putus; edge dari atau ke node yatim ikut putus-putus. Pudarnya lewat transisi CSS, dan mengikuti `prefers-reduced-motion` (perubahan instan dengan highlight singkat).
- Algoritma jalur di `layout.ts` tidak berubah: commit yatim sudah otomatis menjadi rantai sendiri.
- Selama rebase berjalan, commit asli belum yatim (branch masih menunjuk ke sana). Salinan tumbuh di jalur lain dan label HEAD detached ikut berpindah. Pada `rebase-selesai`, label branch pindah ke ujung baru dan commit asli memudar. Pada `rebase-dibatalkan`, salinan memudar.
- `highlightTargets` diperluas untuk event baru (node tujuan reset, node hasil salinan, label branch yang berpindah).

### 4.2 Panel area

- Kotak keempat **Stash** hanya muncul di level yang `allowedCommands`-nya memuat `stash`. Isinya satu chip per entri stash (`stash@{n}` dan nama file). Chip berpindah dari Working ke Stash saat `stash`, dan sebaliknya saat `stash pop`.
- Kolom yang menyala saat `reset-dilakukan`: `--soft` menyalakan Staging, `--mixed` menyalakan Working, `--hard` mengosongkan keduanya.
- Chip konflik dan `conflictFrom` di graf memakai `activeConflicts`, jadi berlaku juga untuk rebase.

### 4.3 Caption

Satu kalimat penjelasan per event baru, dua bahasa. `reset-dilakukan` punya tiga varian (soft, mixed, hard). Prioritas `describeEvents` diperluas agar `rebase-selesai`, `revert-dibuat`, dan `cherry-pick-dibuat` menang atas `commit-dibuat` yang generik, mengikuti perlakuan `merge-commit-dibuat`.

### 4.4 Peta level

`LevelMap` menampilkan semua level sebagai satu jalur stasiun. Dengan 17 level, tata letak CSS harus dicek dan disesuaikan (bungkus ke baris kedua atau gulir horizontal) agar tidak meluap di lebar sempit. Komentar "Sepuluh level" diperbarui.

## 5. Level 11–17

Semua level memakai `projectSetup` (riwayat proyek 14 commit) ditambah langkah khusus level. Tujuan dinilai dari state, sehingga beberapa jalur diterima. Masing-masing punya tepat 3 petunjuk bertingkat dua bahasa, dengan aturan v1 yang sama.

| # | Topik | Skenario | Tujuan (state) | Perintah diizinkan baru |
|---|---|---|---|---|
| 11 | `reset` soft/mixed | Commit terakhir salah, isinya mau diperbaiki | HEAD mundur satu commit; perubahan commit itu masih ada di staging atau working directory (soft atau mixed diterima) | `reset` |
| 12 | `reset --hard` | Dua commit eksperimen gagal | `main` kembali ke commit sebelum eksperimen, working tree bersih, dua commit itu yatim | (sama) |
| 13 | `revert` | Commit buruk di tengah riwayat yang sudah dibagikan | Commit baru yang membalik perubahan buruk; ujung lama masih leluhur HEAD | `revert` |
| 14 | `stash` | Kerjaan setengah jadi, harus memperbaiki bug mendesak | Branch `hotfix` punya commit perbaikan; kembali di `main` dengan perubahan awal dipulihkan dan stash kosong | `stash` |
| 15 | `cherry-pick` | Satu perbaikan berguna di branch eksperimen | `main` mendapat perbaikan itu sebagai commit baru, tanpa commit lain dari eksperimen; eksperimen tidak berubah | `cherry-pick` |
| 16 | `rebase` | Branch tertinggal dari `main` | Riwayat linear: ujung `main` leluhur `feature`; jumlah commit feature tetap; commit asli yatim | `rebase` |
| 17 | `rebase` konflik | Branch dan `main` mengubah baris yang sama | `rebaseState` kosong, riwayat linear, konflik terselesaikan | (sama) |

Level 11 sengaja menerima `--soft` dan `--mixed`; perbedaannya terlihat lewat `status` dan panel area. Level 12 dipisah agar pemain memahami dulu model "pointer bergerak sejauh mana", baru bahayanya.

Level 14 melibatkan banyak langkah nyata: `stash`, `switch`, edit di editor, `add`, `commit`, `switch` kembali, `stash pop`. `switch` yang gagal karena perubahan belum di-commit (pesan sudah menyebut stash) menjadi pemicu belajarnya.

## 6. Pengujian

- **Unit engine** (Vitest), satu berkas per perintah, termasuk kasus tepi:
  - `revision.ts`: semua bentuk yang dikenali dan ditolak, prefix ambigu.
  - `reset`: tiga mode, `--hard` tidak menghapus file tak terlacak, ditolak saat merge/rebase, tanpa commit.
  - `revert`: normal, merge commit ditolak, konflik ditolak tanpa mengubah state, working tree kotor ditolak.
  - `cherry-pick`: normal, id berbeda dari asli, sudah teraplikasi, konflik ditolak.
  - `stash`: push, pop, list, kosong, pop bertabrakan, subperintah tak didukung.
  - `rebase`: up-to-date, fast-forward, linear dengan beberapa commit, konflik, `--continue` (termasuk berhenti lagi), `--abort`, semua perintah diblokir selama rebase.
  - `unreachableCommits` dan `activeConflicts`.
- **Level**: `solvable.test.ts` diperbarui untuk 17 level (daftar id), ditambah solusi alternatif untuk level 11 (soft dan mixed). Tes kebocoran petunjuk dan paritas dua bahasa berlaku otomatis untuk level baru.
- **UI murni**: flag `orphan` di layout, caption baru, `highlightTargets`, dan reducer `game-state` untuk alur rebase.
- **Regresi**: seluruh tes versi 1 lolos tanpa diubah, terutama tes `merge` setelah refactor ke `threeway.ts`.
- **Manual di browser**: transisi memudar, kotak Stash, keterangan "saya/mereka" saat rebase, peta 17 level di lebar sempit, mode `prefers-reduced-motion`.

## 7. Urutan pengerjaan yang disarankan

1. Fondasi tanpa perubahan perilaku: `threeway.ts`, `activeConflicts`, `revision.ts`, `unreachableCommits` (regresi harus hijau).
2. Engine per perintah dengan tesnya: `reset`, `revert`, `cherry-pick`, `stash`, `rebase`.
3. Event, caption, dan pesan dua bahasa.
4. Visualisasi: node yatim, kotak Stash, highlight, peta level.
5. Level 11–17 dengan solusi dan tes kelayakan.
6. Pengecekan manual di browser.

## 8. Di luar cakupan

Versi 2B (`clone`, `push`, `pull`), `rebase -i`, `reflog`, `stash apply/drop/-u`, `revert -m`, konflik pada `revert` dan `cherry-pick`, revisi bentuk `HEAD^` dan `A..B`, `diff`, `.gitignore`, subfolder, akun pengguna, dan backend.
