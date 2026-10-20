# gg-git-game v2B: remote (`clone`, `fetch`, `pull`, `push`) — desain

Tanggal: 2026-10-20. Lanjutan dari `2026-10-20-git-v2a-local-design.md`.

## 1. Tujuan dan cakupan

Versi 2A selesai dengan 17 level. Versi 2B mengajarkan cara kerja tim lewat remote: mengambil proyek (`clone`), memeriksa kabar terbaru (`fetch`), menyatukannya (`pull`), mengirim pekerjaan (`push`), dan memahami kenapa `push` bisa ditolak. Remote **disimulasikan di dalam game**: tidak ada jaringan, backend, akun, atau GitHub sungguhan. Perilaku dan pesan mengikuti git asli sejauh yang dibutuhkan untuk belajar.

Keputusan yang sudah disepakati dengan pemilik proyek:
- Cakupan: `clone`, `push`, `pull`, ditambah `fetch` ringan dan branch pelacak `origin/main` yang tampil di graf.
- Empat level baru (18–21). Peta menjadi 21 stasiun.
- Setiap perubahan lanjutan di-push langsung ke `dhatuker/gg-git-game` atas nama pemilik; Vercel men-deploy otomatis.

Di luar cakupan: `push --force`, `-u`/`--set-upstream`, `pull --rebase`, `remote add/remove`, lebih dari satu remote, branch remote selain `main`, `git branch -r`, `git switch origin/main`, autentikasi, `.gitignore`, dan simulasi waktu nyata (teman yang "bekerja" selagi pemain bermain).

## 2. Model state

Tipe baru di `engine/types.ts`:

```ts
interface RemoteState {
  url: string;                          // mis. "https://github.com/gg-team/taskboard.git"
  connected: boolean;                   // true setelah clone (atau sudah true di initialState level)
  branches: Record<string, string>;     // hanya "main" dipakai di 2B
  commits: Record<string, Commit>;      // repo origin: semua commit yang terjangkau dari branches
}
```

`RepoState` bertambah:
- `remote: RemoteState | null` — `null` di level 1–17.
- `remoteRefs: Record<string, string>` — branch pelacak lokal, kunci tanpa prefiks (`{ main: "<id>" }` berarti `origin/main`).

Prinsip: **commit dipindahkan seperti objek git**. Commit tidak berubah (immutable) dan id-nya hash, jadi `push`/`fetch` menyalin objek commit yang belum ada di sisi seberangnya (berdasarkan id) lalu menggeser pointer. Tidak ada commit yang dihapus. Invarian: `remote.commits` selalu mencakup seluruh leluhur dari tiap `remote.branches[*]`; `state.commits` mencakup seluruh leluhur dari tiap `remoteRefs[*]`.

Turunan:
- `unreachableCommits` menambahkan nilai `remoteRefs` sebagai root (commit yang hanya terjangkau dari `origin/main` tidak yatim).
- `resolveRef(state, name)` (baru, di `engine/revision.ts`): mencari branch lokal, lalu `origin/<b>` di `remoteRefs`. Hanya nama polos (tanpa `~`/`^`; `origin/main~1` tidak didukung). Dipakai oleh `merge`, `rebase` (sebagai target), `log`, dan `resolveRevision` (sehingga `reset`, `revert`, `cherry-pick` menerima `origin/main`). Perintah yang menulis ref (`switch`, `branch -d`, dan sejenisnya) tidak menerima `origin/main`; pesan "bukan branch lokal".
- Penentu "terhubung": `remote !== null && remote.connected`.
- Pelacakan: `main` lokal melacak `origin/main` bila `remoteRefs.main` ada. Tidak ada field `upstream` terpisah.

Id commit unik: `createCommit` memakai `seq = max(seq)+1` dari gabungan commit lokal (`state.commits`) dan remote (`remote.commits`). Dunia level (lokal + remote) dibangun dari satu penghitung `seq` bersama (lihat §6) sehingga commit teman dan commit lokal tidak bertabrakan.

Persistensi/carry: `ui/carry.ts` menormalkan `remote ?? null` (objek polos saja) dan `remoteRefs ?? {}` (objek polos saja), seperti normalisasi `stash`/`rebaseState` di 2A.

## 3. Perintah

`runCommand` melonggarkan guard "repo belum diinisialisasi" untuk `clone` selain `init`. `fetch`, `pull`, `push` ditolak (pesan ramah + pesan git asli) bila belum `connected`: `fatal: 'origin' does not appear to be a git repository`. Semuanya, kecuali `clone` dan `remote`, ditolak saat merge atau rebase berjalan (`inProgressBlock`). Perintah hanya beroperasi pada `main`: bila HEAD bukan di branch `main`, `fetch` tetap boleh, tetapi `pull` dan `push` gagal dengan pesan "game ini hanya mengajarkan pull/push untuk `main`; pindah dulu ke `main`". `git push origin feature` dan `git pull origin feature` gagal dengan pesan yang sama. Argumen `origin` dan `main` opsional dan hanya itu yang diterima.

**`git clone <url>`**
- Hanya bila `!initialized`. Bila `initialized`: `fatal: destination path '.' already exists and is not an empty directory.`
- `<url>` harus sama dengan `remote.url` (dengan atau tanpa akhiran `.git`). Selain itu, atau bila `remote === null`: `fatal: repository '<url>' not found`. Argumen kedua (nama folder) tidak didukung.
- Efek: `initialized = true`, `commits` = seluruh commit remote, `branches.main` = `remoteRefs.main` = `remote.branches.main`, `head` = branch `main`, `files` dan `index` = snapshot ujung, `remote.connected = true`. Event `clone-selesai`.

**`git fetch` (`git fetch origin`)**
- Menyalin commit remote yang belum ada ke `state.commits`; `remoteRefs.main = remote.branches.main`. Tidak menyentuh branch lokal, index, dan file kerja.
- Tak ada yang baru: pesan ramah "tidak ada yang baru", tanpa event.
- Event `fetch-selesai { from, to }` (id lama dan baru `origin/main`).

**`git pull` (`git pull origin main`)**
- Sama dengan `fetch` lalu merge `origin/main` ke `main`. Hasil: sudah terbaru ("Already up to date."), fast-forward, merge commit (pesan `Merge branch 'main' of <url>`), atau konflik. Konflik memakai `mergeState` biasa: `{ from: "origin/main", fromCommit, conflicts }`, sehingga `resolveConflict`, `add`, `commit` bekerja tanpa perubahan.
- Guard sama dengan `merge`: perubahan belum di-commit pada file terlacak ditolak (`state.dirty`), file tak terlacak yang akan tertimpa ditolak.
- Implementasi: logika inti `merge` (sekitar 60 baris) diekstrak menjadi fungsi bersama `mergeCommit(state, targetId, label, messageText)` di `engine/commands/merge.ts`; `merge` dan `pull` memanggilnya. Perilaku `merge` yang sudah ada tidak berubah (tes lama tetap lulus).
- Bila `main` tertinggal dari `origin/main` karena `fetch` manual sebelumnya, `pull` tidak mengambil apa-apa tetapi tetap menyatukan `origin/main` ke `main`.

**`git push` (`git push origin main`)**
- Syarat berhasil: ujung `remote.branches.main` terjangkau dari ujung `main` lokal (fast-forward). Efek: menyalin commit lokal yang belum ada di `remote.commits`, `remote.branches.main` = `remoteRefs.main` = ujung lokal. Event `push-berhasil { from, to, count }`.
- Sama persis: "Everything up-to-date."
- Ditolak bila tidak fast-forward. Dua varian pesan git asli, satu kunci ramah:
  - ujung remote tidak ada di `state.commits` (belum di-fetch): `! [rejected] main -> main (fetch first)`;
  - ada tetapi bukan leluhur: `! [rejected] main -> main (non-fast-forward)`.
  Pesan ramah menjelaskan bahwa remote punya pekerjaan yang belum kamu punya dan menyarankan `git pull`. Tidak ada event yang dipancarkan pada penolakan. State tidak berubah.
- `push` dengan branch tanpa commit (belum ada commit): gagal seperti perintah lain.

**`git remote -v`** menampilkan dua baris `origin <url> (fetch)` / `(push)` bila terhubung, kosong bila tidak. `git remote` mencetak `origin`. Subperintah lain (`add`, `remove`, ...) gagal dengan pesan "tidak didukung".

**Flag tak dikenal** (`--force`, `-f`, `-u`, `--rebase`, dll.) pada `push`/`pull`/`fetch`/`clone` mengembalikan `*.badFlag` dengan penjelasan singkat bahwa game ini belum mengajarkan opsi itu.

`engine/suggest.ts` `KNOWN_COMMANDS` bertambah `clone`, `fetch`, `pull`, `push`, `remote`.

**`git status`** (bila terhubung dan HEAD di `main`) menambah satu baris setelah baris branch (dan sebelum baris rebase, bila ada): up to date / ahead N / behind N / diverged (ahead N, behind M), mengikuti pola git asli. Karena baris ini bagian header, pemeriksaan "clean" memakai `headerLines` yang sudah ada.

## 4. Event, tampilan, dan caption

Event baru: `clone-selesai { tip }`, `fetch-selesai { from, to }`, `push-berhasil { from, to, count }`. Penolakan `push` tidak memancarkan event. `pull` menghasilkan `fetch-selesai` lalu event merge yang sudah ada.

- **Graf:** label `origin/main` digambar di samping label `main` pada commit yang ditunjuk, dengan kelas CSS berbeda (`gg-label-remote`: garis putus-putus atau warna sekunder). Bila `main` dan `origin/main` di commit yang sama, label ditumpuk. `origin/main` yang menunjuk commit di luar riwayat `main` tampil seperti branch biasa (commit sudah ada di `state.commits` setelah fetch).
- **Panel area:** satu kotak "Remote" saat level mengizinkan perintah remote, aturan tampil seperti kotak Stash (`showRemote`, dari `allowedCommands`). Isi: satu chip untuk ujung `origin` saat ini (`id` + pesan, diambil dari `remote.commits`, jadi pemain **bisa melihat** commit teman sebelum `fetch`), ditambah ringkasan ahead/behind. Label langkah `git push` / `git pull` mengikuti pola `gg-area-step`. Mulai level 18 kotak Stash (sejak level 14) dan Remote tampil bersamaan, sehingga grid `.gg-areas` mendukung hingga lima kotak (Working, Staging, Repo, Stash, Remote): satu baris di layar lebar, membungkus (`auto-fit`) di lebar menengah, dan bertumpuk di bawah 640px. Sorotan kolom (`litColumn`): `push-berhasil` menyalakan Remote, `fetch-selesai` dan `clone-selesai` menyalakan Local/Repo sesuai pola yang ada.
- **Caption/animasi:** keterangan untuk keempat event (id dan en), diurutkan dalam prioritas `describeEvents` setelah `rebase-selesai`.
- **Reduced motion:** perubahan label instan dengan sorotan singkat, mengikuti aturan global yang ada.
- **Teks:** semua kunci baru ada di `id` dan `en` dengan set `{param}` identik (tes kamus).

## 5. Pesan

Kunci engine baru (id + en): `clone.*` (`alreadyInit`, `notFound`, `badFlag`, `done`), `fetch.*` (`upToDate`, `done`, `badFlag`), `pull.*` (`onlyMain`, `upToDate`, `done`, `badFlag`), `push.*` (`onlyMain`, `upToDate`, `done`, `rejectedFetchFirst`, `rejectedNonFastForward`, `badFlag`, `noCommits`), `remote.*` (`unsupported`, `noRepo`), `status.tracking*` (up to date, ahead, behind, diverged). Format sama dengan 2A: pesan berkunci di baris pertama, pesan asli git (`raw`) di bawahnya. Pesan penolakan `push` diakhiri petunjuk hint `git pull`.

## 6. Level 18–21

Level memakai pola level 11–17 (data file di `levels/`, tiga petunjuk bertingkat id+en tanpa kebocoran solusi, tes "belum selesai di state awal"). Dunia (lokal + remote) dibangun oleh helper `remoteWorld(...)` di `levels/history.ts` yang memakai satu penghitung `seq` bersama dan `projectSetup` (riwayat 14 commit) sebagai dasar. URL: `https://github.com/gg-team/taskboard.git`.

| Level | Judul id / en | Awal | Tujuan | Solusi |
|---|---|---|---|---|
| 18 | "Ambil proyek" / "Get the project" | `initialized=false`, folder kosong, `remote` berisi riwayat proyek, `connected=false` | repo terinisialisasi; `branches.main` = ujung remote; `remoteRefs.main` ada; file proyek ada | `git clone <url>` |
| 19 | "Kirim pekerjaanmu" / "Send your work" | sudah di-clone; satu file baru `notes.txt` belum dilacak | `remote.branches.main` = `branches.main` ≠ ujung awal; snapshot ujung remote memuat `notes.txt` | `git add .`, `git commit -m "Add notes"`, `git push` |
| 20 | "Ambil kabar terbaru" / "Catch up" | sudah di-clone; remote punya 2 commit teman yang belum ada di lokal | `branches.main` = `remote.branches.main`; `remoteRefs.main` sama; tak ada commit lokal tambahan | `git pull` (alternatif sah: `git fetch` + `git merge origin/main`) |
| 21 | "Push ditolak" / "Push rejected" | sudah di-clone; satu commit lokal ("Add search box", `search.js`) belum di-push; remote punya satu commit teman ("Update docs", `docs.md`) | `remote.branches.main` = `branches.main`; riwayat remote memuat kedua pesan commit dan kedua file; `mustRun: ["push"]` | `git push` (ditolak), `git pull` (merge commit), `git push` |

Catatan:
- Level 20: cerita menyebut teman sudah mendorong pekerjaan; petunjuk 1 hanya konseptual ("ada yang baru di remote"), petunjuk 2 menyebut membandingkan `origin/main` dan `main` di graf dan panel Remote, petunjuk 3 memberi bentuk perintah tanpa argumen utuh. Level 21: cerita menegaskan penolakan sebagai pemicu belajar. Tujuan level 21 juga menerima `git fetch` + `git rebase origin/main` + `git push` (riwayat linear), karena goal hanya memeriksa pesan dan isi.
- `allowedCommands`: level 18 = level 17 + `clone`; level 19 + `push`, `remote`; level 20 + `pull`, `fetch`; level 21 sama dengan 20.
- Pergantian bahasa, penyimpanan progres, dan peta mengikuti mekanisme 2A. `LevelMap` sudah menggulir horizontal; 21 stasiun tidak butuh perubahan struktur.
- Levels 1–17 tidak berubah (`remote: null`, `remoteRefs: {}` ditambahkan di `createEmptyRepo`).

## 7. Pengujian

- **Engine** (`engine/__tests__/`): `remote-refs` (`resolveRef`, `unreachableCommits` dengan `remoteRefs`), `clone` (sukses, URL salah, sudah init, `remote` null, state tak berubah saat gagal), `fetch` (menyalin commit, tidak menyentuh branch/file, no-op, invarian closure), `push` (fast-forward, up-to-date, ditolak fetch-first dan non-fast-forward, state tak berubah, penyalinan commit tepat), `pull` (up to date, fast-forward, merge commit, konflik lalu `resolveConflict` + `add` + `commit`, guard dirty/untracked, ditolak saat merge/rebase), `remote` (-v, subperintah tak didukung), `status` ahead/behind/diverged, flag tak dikenal, `merge`/`rebase`/`log`/`reset` menerima `origin/main`, tes regresi `merge` yang sudah ada.
- **UI:** `describeEvents` untuk event baru, `litColumn`, `columns` untuk kotak Remote, layout label `origin/main`, normalisasi `carry`, `game-state` (level 17→18 dari save lama).
- **Level:** `solvable.test.ts` (id [1..21]), `level-alt-solutions.test.ts` (level 20: `pull` dan `fetch`+`merge` diterima, `fetch` saja tidak; level 21: `push` pertama ditolak, rebase diterima, `pull --rebase` dan `push --force` ditolak sebagai flag), kebocoran petunjuk, paritas id/en, "belum selesai di state awal".
- Verifikasi akhir: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Pemeriksaan manual di browser (level 18–21, label `origin/main`, kotak Remote) oleh pemilik.

## 8. Risiko dan keputusan

- **Tabrakan id commit:** dicegah dengan penghitung `seq` bersama saat membangun dunia level, dan karena `createCommit` memakai `max(seq)+1` pada `state.commits` (yang kini juga memuat commit hasil fetch).
- **Label bertumpuk:** `main` dan `origin/main` di commit yang sama; label ditumpuk vertikal dengan kelas berbeda. Diperiksa manual.
- **`merge` direfaktor:** ekstraksi `mergeCommit` hanya memindahkan kode; tes `merge`/`conflict` yang ada adalah jaring pengaman, ditambah tes `pull`.
- **Simplifikasi yang disengaja:** satu remote, satu branch (`main`), tanpa `upstream` eksplisit, tanpa flag. Pesan penolakan menjelaskan batas ini supaya pemain tidak bingung.
