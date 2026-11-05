/**
 * Pemetaan indeks output softmax model ke karakter/kata isyarat.
 * Urutan indeks 0, 1, 2, ... HARUS SAMA dengan urutan encoder.classes_ di Python.
 */
const SIGN_LABELS = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
  4: "E"
  // Tambahkan kelas lain sesuai dataset yang Anda latih di Colab
};

/**
 * Mengambil label berdasarkan indeks probabilitas tertinggi.
 * @param {number} index - Indeks argmax dari tensor prediksi
 * @returns {string} Label karakter/kata yang dikenali
 */
function getLabelByIndex(index) {
  return SIGN_LABELS[index] !== undefined ? SIGN_LABELS[index] : `Kelas #${index}`;
}

// Ekspos ke global window
if (typeof window !== 'undefined') {
  window.SIGN_LABELS = SIGN_LABELS;
  window.getLabelByIndex = getLabelByIndex;
}
