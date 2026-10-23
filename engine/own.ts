/**
 * Kunci milik objek itu sendiri. Dipakai untuk nama dari input pemain (branch, file, perintah):
 * operator `in` ikut membaca Object.prototype, sehingga nama seperti `constructor` dianggap ada.
 */
export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
