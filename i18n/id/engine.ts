import type { EngineDict } from "../types";

export const id: EngineDict = {
  "parse.unclosedQuote": 'Tanda kutip belum ditutup. Pastikan pesan diapit "...".',
  "parse.empty": "Ketik sebuah perintah, misalnya `git status`.",
  "parse.notGit": "Perintah harus diawali `git`, misalnya `git status`.",
  "parse.missingCommand": "Tambahkan nama perintah setelah `git`, misalnya `git status`.",

  "repo.notInitialized": "Folder ini belum menjadi repositori git (bukan repositori git). Jalankan `git init` dulu.",
  "command.unknown": "Perintah `git {cmd}` tidak dikenal di game ini.",
  "command.unknownSuggest": "Perintah `git {cmd}` tidak dikenal di game ini. Mungkin maksudmu `git {suggestion}`?",
  "state.dirty": "Ada perubahan yang belum di-commit. Commit dulu (`git add` lalu `git commit`) sebelum pindah atau merge.",
  "untracked.switch":
    "File {files} belum dilacak git dan akan tertimpa kalau kamu pindah branch. Commit dulu (`git add` lalu `git commit`) atau ganti namanya.",
  "untracked.merge":
    "File {files} belum dilacak git dan akan tertimpa kalau kamu merge. Commit dulu (`git add` lalu `git commit`) atau ganti namanya.",
  "files.invalidName": "Nama file hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda minus, tanpa spasi.",
  "files.notConflicted": "File `{file}` tidak sedang konflik.",

  "init.done": "Repositori git kosong berhasil dibuat.",
  "init.already": "Repositori ini sudah dibuat sebelumnya.",

  "status.onBranch": "Di branch {branch}",
  "status.detached": "HEAD terlepas (detached) di {id}",
  "status.conflicts": "Konflik belum diselesaikan:",
  "status.staged": "Perubahan yang akan di-commit:",
  "status.unstaged": "Perubahan yang belum di-stage:",
  "status.untracked": "File yang belum dilacak:",
  "status.clean": "Tidak ada yang perlu di-commit, working tree bersih",

  "add.nothingSpecified": "Sebutkan file yang mau di-stage, misalnya `git add README.md` atau `git add .`.",
  "add.missingFile": "File `{file}` tidak ada di working directory.",
  "add.staged": "File masuk staging: {files}",
  "add.conflictResolved": "Konflik di {files} ditandai selesai.",
  "add.conflictsRemain": "Masih ada konflik di: {files}.",
  "add.allConflictsResolved": 'Semua konflik selesai. Lanjutkan dengan `git commit -m "..."` untuk membuat merge commit.',
  "add.nothingNew": "Tidak ada perubahan baru untuk di-stage.",

  "commit.needMessage": 'Commit butuh pesan. Tulis seperti ini: `git commit -m "pesan singkat"`.',
  "commit.conflictsRemain": "Masih ada konflik di: {files}. Selesaikan isinya lalu jalankan `git add` untuk file tersebut.",
  "commit.nothingStaged": "Belum ada perubahan di staging. Jalankan `git add` dulu.",
  "commit.mergeDone": "Merge selesai.",

  "log.noCommits": "Belum ada commit untuk ditampilkan. Buat commit pertama dulu.",

  "branch.noCommits": "Branch hanya bisa dibuat setelah ada commit pertama.",
  "branch.invalidName":
    "Nama branch `{name}` tidak valid. Gunakan huruf, angka, titik, garis bawah, garis miring, atau tanda minus (tidak boleh diawali tanda minus).",
  "branch.exists": "Branch `{name}` sudah ada.",
  "branch.created": "Branch `{name}` dibuat di commit {id}.",
  "branch.noneYet": "Belum ada branch karena belum ada commit.",
  "branch.deleteNeedsName": "Sebutkan branch yang mau dihapus: `git branch -d <nama>`.",
  "branch.notFound": "Branch `{name}` tidak ditemukan.",
  "branch.deleteCurrent": "Tidak bisa menghapus branch `{name}` karena sedang dipakai. Pindah ke branch lain dulu.",
  "branch.notMerged": "Branch `{name}` punya commit yang belum di-merge. Merge dulu agar commit-nya tidak hilang.",
  "branch.deleted": "Branch `{name}` dihapus.",

  "switch.needTarget": "Sebutkan branch tujuan, misalnya `git switch main`.",
  "switch.mergeInProgress": "Selesaikan merge yang sedang berlangsung dulu.",
  "switch.alreadyOn": "Sudah berada di branch `{branch}`.",
  "switch.switched": "HEAD sekarang menunjuk ke branch `{branch}`.",
  "switch.detached": "HEAD sekarang menunjuk langsung ke commit {id} (detached HEAD).",
  "switch.notFound": "Branch atau commit `{target}` tidak ditemukan.",

  "merge.needTarget": "Sebutkan branch yang mau di-merge, misalnya `git merge feature`.",
  "merge.inProgress": "Masih ada merge yang belum selesai. Selesaikan konfliknya, `git add`, lalu `git commit`.",
  "merge.notFound": "Branch `{branch}` tidak ditemukan.",
  "merge.noCommits": "Buat commit pertama dulu sebelum melakukan merge.",
  "merge.upToDate": "Branch `{branch}` sudah tercakup, tidak ada yang perlu di-merge.",
  "merge.fastForward": "Fast-forward: pointer `{branch}` maju ke {to}.",
  "merge.conflict": "Konflik! File berikut diubah berbeda di kedua branch: {files}.",
  "merge.conflictNext": "Pilih isi yang benar, lalu `git add <file>` dan `git commit`.",
  "merge.commitCreated": "Merge commit {id} dibuat dengan dua parent.",
};
