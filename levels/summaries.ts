import type { Localized } from "./types";

/** Inti yang dipelajari di tiap level, ditampilkan di rangkuman setelah level selesai. Kunci = id level. */
export const SUMMARIES: Record<number, Localized> = {
  1: {
    id: "`git init` membuat folder tersembunyi `.git` yang menyimpan seluruh riwayat. Sebelum itu, git tidak melacak apa pun di folder ini.",
    en: "`git init` creates the hidden `.git` folder that stores all history. Before it, git tracks nothing in this folder.",
  },
  2: {
    id: "`git status` menunjukkan file mana yang baru, berubah, atau sudah di-stage. Jalankan sebelum `add` dan `commit` supaya kamu tahu apa yang akan terjadi.",
    en: "`git status` shows which files are new, changed, or staged. Run it before `add` and `commit` so you know what will happen.",
  },
  3: {
    id: "`git add` memindahkan perubahan dari working directory ke staging area. Kamu sendiri yang memilih apa yang masuk ke commit berikutnya.",
    en: "`git add` moves changes from the working directory to the staging area. You choose what goes into the next commit.",
  },
  4: {
    id: "Commit adalah foto isi staging area pada satu saat. Hanya file yang sudah di-add yang ikut tersimpan; sisanya tetap di working directory.",
    en: "A commit is a snapshot of the staging area at one moment. Only files you have added are saved; the rest stay in the working directory.",
  },
  5: {
    id: "`git log` membaca riwayat dari commit terbaru ke yang paling lama. Setiap commit menunjuk ke parent-nya, dan itulah yang membentuk garis di graf.",
    en: "`git log` reads history from the newest commit to the oldest. Each commit points to its parent, and that forms the line in the graph.",
  },
  6: {
    id: "Branch hanyalah label yang menempel di sebuah commit. Membuatnya murah karena tidak ada file yang disalin.",
    en: "A branch is just a label attached to a commit. Creating one is cheap because no files are copied.",
  },
  7: {
    id: "`git switch` memindahkan HEAD ke branch lain dan menyesuaikan isi working directory. Commit baru selalu masuk ke branch tempat HEAD berada.",
    en: "`git switch` moves HEAD to another branch and updates the working directory. New commits always go to the branch HEAD is on.",
  },
  8: {
    id: "Kalau branch tujuan belum berubah, merge cukup menggeser labelnya maju (fast-forward). Tidak ada commit baru.",
    en: "If the target branch has not changed, a merge just slides its label forward (fast-forward). No new commit is made.",
  },
  9: {
    id: "Kalau kedua branch punya commit baru, merge membuat merge commit dengan dua parent yang menyatukan keduanya.",
    en: "If both branches have new commits, a merge creates a merge commit with two parents that joins them.",
  },
  10: {
    id: "Konflik terjadi saat kedua branch mengubah bagian file yang sama. Kamu yang menentukan isi akhirnya, lalu menyelesaikan merge dengan commit.",
    en: "A conflict happens when both branches change the same part of a file. You decide the final content, then finish the merge with a commit.",
  },
  11: {
    id: "`git reset` memundurkan pointer branch. Dengan `--soft` atau `--mixed`, perubahanmu tetap ada; bedanya apakah perubahan itu tetap di-stage.",
    en: "`git reset` moves the branch pointer back. With `--soft` or `--mixed` your changes stay; the difference is whether they remain staged.",
  },
  12: {
    id: "`git reset --hard` memundurkan branch dan membuang perubahan di staging serta file kerja. Commit yang dilewati masih ada, tapi tidak terjangkau lagi dari branch.",
    en: "`git reset --hard` moves the branch back and discards changes in staging and the working files. The skipped commits still exist but are no longer reachable from a branch.",
  },
  13: {
    id: "`git revert` membatalkan isi sebuah commit dengan commit baru. Riwayat lama tidak diubah, jadi aman dipakai pada riwayat yang sudah dibagikan.",
    en: "`git revert` undoes a commit's content with a new commit. The old history is not rewritten, so it is safe on shared history.",
  },
  14: {
    id: "`git stash` menyimpan pekerjaan yang belum selesai ke rak sementara, lalu `git stash pop` mengembalikannya. Berguna saat harus pindah branch mendadak.",
    en: "`git stash` puts unfinished work on a temporary shelf, and `git stash pop` brings it back. Useful when you must switch branches suddenly.",
  },
  15: {
    id: "`git cherry-pick` menyalin perubahan satu commit ke branch yang sedang aktif sebagai commit baru, tanpa membawa commit lain.",
    en: "`git cherry-pick` copies the change from one commit onto the current branch as a new commit, without bringing other commits along.",
  },
  16: {
    id: "`git rebase` menyalin commit-commit branch ke atas dasar yang baru, sehingga riwayat menjadi lurus tanpa merge commit.",
    en: "`git rebase` copies a branch's commits on top of a new base, so history stays linear without a merge commit.",
  },
  17: {
    id: "Rebase bisa berhenti karena konflik di salah satu commit salinan. Selesaikan, `git add`, lalu `git rebase --continue` sampai semua commit tersalin.",
    en: "A rebase can stop on a conflict in one of the copied commits. Resolve it, `git add`, then `git rebase --continue` until every commit is copied.",
  },
  18: {
    id: "`git clone` menyalin repositori dari server beserta seluruh riwayatnya, dan mengingat server itu sebagai `origin`.",
    en: "`git clone` copies a repository from a server with its full history, and remembers that server as `origin`.",
  },
  19: {
    id: "`git push` mengirim commit lokalmu ke server. Setelahnya `main` di server dan `origin/main` di komputermu menunjuk ke commit yang sama.",
    en: "`git push` sends your local commits to the server. Afterwards `main` on the server and `origin/main` on your computer point to the same commit.",
  },
  20: {
    id: "`git fetch` hanya mengambil commit baru dari server, sedangkan `git pull` mengambil lalu langsung menggabungkannya ke branch-mu.",
    en: "`git fetch` only downloads new commits from the server, while `git pull` downloads and then merges them into your branch.",
  },
  21: {
    id: "Push ditolak kalau server punya commit yang belum kamu miliki. Ambil dulu dengan `git pull`, lalu `git push` lagi tanpa menimpa pekerjaan temanmu.",
    en: "A push is rejected when the server has commits you do not have. Pull first, then push again without overwriting your teammate's work.",
  },
};

/** Satu baris penjelasan per perintah, untuk tab "Catatan perintah". */
export const COMMAND_NOTES: Record<string, Localized> = {
  init: { id: "Mengubah folder biasa menjadi repositori git.", en: "Turns an ordinary folder into a git repository." },
  status: { id: "Menampilkan file yang baru, berubah, atau sudah di-stage.", en: "Shows files that are new, changed, or staged." },
  add: { id: "Memindahkan perubahan ke staging area.", en: "Moves changes to the staging area." },
  commit: { id: "Menyimpan isi staging area sebagai satu titik riwayat.", en: "Saves the staging area as one point in history." },
  log: { id: "Membaca riwayat commit.", en: "Reads the commit history." },
  diff: { id: "Menampilkan baris yang berubah dan belum di-commit.", en: "Shows the lines that changed and are not committed yet." },
  branch: { id: "Membuat, menampilkan, atau menghapus branch.", en: "Creates, lists, or deletes branches." },
  switch: { id: "Pindah ke branch lain.", en: "Moves to another branch." },
  checkout: { id: "Pindah branch atau commit (cara lama dari switch).", en: "Moves to a branch or commit (the older form of switch)." },
  merge: { id: "Menggabungkan branch lain ke branch yang aktif.", en: "Merges another branch into the current one." },
  reset: { id: "Memundurkan pointer branch; --hard juga membuang perubahan.", en: "Moves the branch pointer back; --hard also discards changes." },
  revert: { id: "Membatalkan sebuah commit dengan commit baru.", en: "Undoes a commit with a new commit." },
  stash: { id: "Menyimpan perubahan sementara; pop mengembalikannya.", en: "Shelves changes temporarily; pop brings them back." },
  "cherry-pick": { id: "Menyalin satu commit ke branch aktif.", en: "Copies one commit onto the current branch." },
  rebase: { id: "Memindahkan commit ke atas dasar yang baru.", en: "Moves commits on top of a new base." },
  clone: { id: "Menyalin repositori dari server.", en: "Copies a repository from a server." },
  push: { id: "Mengirim commit lokal ke server.", en: "Sends local commits to the server." },
  remote: { id: "Menampilkan server yang terhubung.", en: "Shows the connected server." },
  fetch: { id: "Mengambil commit baru dari server tanpa menggabungkan.", en: "Downloads new commits from the server without merging." },
  pull: { id: "Mengambil lalu menggabungkan commit dari server.", en: "Downloads and merges commits from the server." },
};
