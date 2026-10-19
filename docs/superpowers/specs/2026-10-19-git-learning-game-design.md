# Game Belajar Git — Spesifikasi Desain

Tanggal: 2026-10-19
Status: menunggu review pengguna

## 1. Tujuan dan konteks

Game berbasis browser untuk belajar git dari level pemula, dengan tingkat kesulitan naik bertahap. Setiap perintah git yang dijalankan pemain divisualisasikan, sehingga pemain memahami model mental git (commit sebagai node, branch sebagai pointer, HEAD, tiga area) dan bukan sekadar menghafal perintah.

Kriteria sukses: setelah menamatkan 10 level, pemain bisa menjelaskan apa yang terjadi pada graf commit ketika menjalankan `init`, `add`, `commit`, `branch`, `switch`, dan `merge`, termasuk saat terjadi konflik.

Dokumen ini adalah spec versi 1. Proyek dibangun di atas scaffold Next.js yang sudah ada di folder proyek.

## 2. Keputusan yang sudah disepakati

- Platform: browser.
- Mode input: hybrid. Level awal memakai tombol dengan perintah yang ditampilkan, level berikutnya memakai terminal simulasi.
- Cakupan versi 1: perintah dasar ditambah percabangan dan merge (10 level).
- Pendekatan: mini git engine buatan sendiri (disederhanakan, bukan git asli).
- Stack: Next.js 16 + React 19 + TypeScript + Tailwind 4 (sudah terpasang), Vitest ditambahkan untuk pengujian.
- Bahasa teks game: Bahasa Indonesia.
- Progres level disimpan di `localStorage`.

## 3. Arsitektur

Tiga lapisan yang terpisah:

1. `engine/` — TypeScript murni, tanpa React dan tanpa Next.js.
2. `levels/` — data level.
3. `ui/` — komponen React.

Game berjalan sepenuhnya di sisi client sebagai satu halaman (`'use client'`). Tidak ada API server atau database.

### 3.1 Engine

State repo bersifat immutable:

- `initialized`: boolean.
- `files`: working directory, peta nama file ke isi teks. Tidak ada subfolder.
- `index`: staging area, struktur sama dengan `files`.
- `commits`: peta id ke `{ id, parents[], message, snapshot }`. Id berupa hash pendek 7 karakter yang deterministik.
- `branches`: peta nama branch ke id commit.
- `HEAD`: menunjuk ke branch, atau langsung ke commit (detached HEAD, hanya lewat `checkout <id>`).
- `mergeState`: terisi hanya ketika merge berhenti karena konflik.

Setiap perintah adalah fungsi: `(state, argumen) -> { state baru, output teks, daftar event, error? }`. Engine tidak pernah melempar exception ke UI.

Event yang dihasilkan: `repo-dibuat`, `file-di-stage`, `commit-dibuat`, `branch-dibuat`, `branch-dihapus`, `branch-pindah`, `head-pindah`, `merge-fast-forward`, `merge-commit-dibuat`, `konflik-terjadi`, `konflik-selesai`. Daftar event inilah yang menggerakkan animasi.

### 3.2 Perintah yang didukung

- `init`, `status`, `add <file>` / `add .`, `commit -m "..."`, `log` / `log --oneline`
- `branch` (daftar), `branch <nama>`, `branch -d <nama>`
- `switch <branch>`, `switch -c <branch>`, dan alias `checkout` (`checkout -b`, `checkout <commit-id>`)
- `merge <branch>` dengan tiga hasil:
  - fast-forward: pointer branch maju, tidak ada commit baru.
  - merge commit: dua cabang berubah tanpa tabrakan, dibuat commit dengan dua parent.
  - konflik: file yang diubah berbeda di kedua cabang. Penanda `<<<<<<<`, `=======`, `>>>>>>>` ditulis ke file. Pemain menyelesaikan konflik lalu menjalankan `add` dan `commit`.

Di luar cakupan versi 1: `rebase`, `reset`, `revert`, `stash`, `cherry-pick`, remote (`clone`, `push`, `pull`), `diff`, `.gitignore`, subfolder. Struktur engine menyisakan ruang untuk menambahkannya di versi 2.

### 3.3 Pengubahan file

Git tidak membuat atau mengubah isi file, jadi game menyediakan panel editor file kecil: pilih file lalu ubah isinya, atau buat file baru. Untuk konflik, pemain memilih "pakai versi saya", "pakai versi mereka", atau mengedit manual. Aksi editor tidak memakai perintah shell.

### 3.4 Pesan error

Tiga jenis, semuanya dalam Bahasa Indonesia ramah beserta petunjuk langkah berikutnya, dengan pesan asli git di bawahnya agar pemain mengenali output aslinya:

- Perintah tidak dikenal: saran perintah yang mirip.
- Perintah valid tetapi belum dibuka di level ini.
- Kesalahan git yang wajar (commit tanpa staging, branch sudah ada, dan sebagainya).

### 3.5 Levels

Setiap level adalah satu berkas data berisi: judul, narasi, state awal, perintah yang diizinkan, mode input (tombol atau terminal), petunjuk bertingkat, dan fungsi murni `isGoalReached(state)`. Penyelesaian dinilai dari state hasil, bukan urutan perintah, sehingga pemain boleh menempuh jalur berbeda. Karena `status` dan `log` tidak mengubah state, level dapat menambahkan `mustRun`: daftar perintah yang harus pernah dijalankan dengan sukses di level itu (urutan bebas), selain tujuan berbasis state. Level berikutnya terbuka setelah tujuan tercapai.

| # | Topik | Mode input |
|---|---|---|
| 1 | `init`: membuat repo | Tombol |
| 2 | `status`: working directory dan file baru | Tombol |
| 3 | `add`: memasukkan ke staging | Tombol |
| 4 | `commit`: menyimpan snapshot | Tombol |
| 5 | `log`: membaca riwayat | Tombol dan terminal |
| 6 | `branch`: membuat cabang | Terminal |
| 7 | `switch` / `checkout`: pindah cabang | Terminal |
| 8 | `merge` fast-forward | Terminal |
| 9 | `merge` dengan merge commit | Terminal |
| 10 | Menyelesaikan konflik merge | Terminal |

Bantuan: petunjuk bertingkat muncul setelah beberapa percobaan keliru. Tombol "Ulangi level" mengembalikan state awal level.

## 4. UI

Satu halaman, dua kolom:

```
┌───────────────────────┬──────────────────────────────┐
│ Level & instruksi     │  GitGraph (graf commit)      │
├───────────────────────┤──────────────────────────────┤
│ Terminal / ButtonBar  │  AreaPanel                   │
│ + editor file         │  Working → Staging → Repo    │
└───────────────────────┴──────────────────────────────┘
```

Komponen: `LevelPanel`, `Terminal`, `ButtonBar`, `FileEditor`, `GitGraph`, `AreaPanel`.

`ButtonBar` hanya menyusun string perintah dan mengirimkannya lewat jalur yang sama dengan `Terminal`, sehingga engine hanya punya satu pintu masuk.

### 4.1 GitGraph (SVG)

- Commit adalah lingkaran berlabel hash pendek. Posisi horizontal mengikuti kedalaman commit, setiap branch punya satu jalur (baris).
- Branch dan HEAD berupa label (pill) yang menempel di commit yang ditunjuk. Label HEAD berwarna berbeda.
- Merge commit punya dua garis ke parent-nya.
- Posisi dihitung oleh fungsi layout murni (dapat diuji terpisah dari React).

### 4.2 Animasi

Digerakkan oleh daftar event dari engine, dengan transisi CSS pada elemen SVG:

- `commit-dibuat`: node baru muncul (fade dan scale) dari parent, label branch bergeser ke node itu.
- `branch-pindah` / `merge-fast-forward`: label slide ke commit tujuan.
- `merge-commit-dibuat`: garis kedua digambar bertahap.
- `file-di-stage` dan `commit-dibuat`: chip file berpindah antar kolom di `AreaPanel`.
- Setiap perintah menampilkan satu kalimat penjelasan di bawah graf, misalnya "Pointer `main` maju ke commit `a3f9c1e`. Tidak ada commit baru yang dibuat."

Prinsip:

- Animasi hanya kosmetik. State engine langsung final, animasi diputar dari antrean event, tidak pernah memblokir input, dan antrean bisa dilewati.
- Mengikuti `prefers-reduced-motion`: perubahan instan dengan highlight singkat.
- Elemen yang baru berubah di-highlight sebentar.

## 5. Pengujian

- Unit test engine (Vitest) untuk setiap perintah, termasuk kasus tepi: fast-forward, merge commit, konflik, dan error umum.
- Uji kelayakan level: setiap level menyimpan skrip solusi (daftar perintah). Tes otomatis menjalankannya dan memastikan `isGoalReached` bernilai benar.
- Uji fungsi layout graf.
- Pengecekan manual di browser untuk animasi dan tampilan.

## 6. Catatan implementasi (Next.js)

- Proyek memakai Next.js 16.4.2 dan React 19.3.0. `AGENTS.md` mewajibkan membaca dokumentasi di `node_modules/next/dist/docs/` sebelum menulis kode Next, karena API dan konvensinya dapat berbeda dari versi yang umum dikenal. Hal ini harus dilakukan di awal tahap implementasi.
- `next.config.ts` mengaktifkan `cacheComponents` dan `partialPrefetching`. Perlu dipastikan halaman game (client component, tanpa data server) kompatibel dengan opsi tersebut.
- Engine dan levels tidak boleh mengimpor apa pun dari `next` atau `react`.
- Struktur folder: `engine/`, `levels/`, dan `ui/` berada di root proyek, bersebelahan dengan `app/` (tidak memakai folder `src`). `app/page.tsx` hanya merakit komponen dari `ui/`.

## 7. Di luar cakupan

Semua yang tercantum di bagian 3.2 sebagai "di luar cakupan versi 1", serta akun pengguna, backend, dan sinkronisasi progres antar perangkat.
