/**
 * Normalisasi 21 titik koordinat landmark tangan dari MediaPipe.
 * Algoritma:
 * 1. Translasi: Menjadikan pergelangan tangan (wrist / indeks 0) sebagai titik pusat (0, 0, 0).
 * 2. Penskalaan: Membagi seluruh koordinat dengan jarak Euclidean terjauh dari pergelangan tangan.
 * 
 * @param {Array} landmarks - Array berisi 21 objek titik {x, y, z} dari MediaPipe Hands
 * @returns {Array<number>|null} Array 63 angka float [x0, y0, z0, x1, y1, z1, ..., x20, y20, z20]
 */
function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) {
    console.error("Landmarks tidak valid: Diperlukan tepat 21 titik sendi.");
    return null;
  }

  const base = landmarks[0];
  const relativeCoords = [];
  let maxDistance = 0;

  // Langkah 1: Translasi koordinat relatif ke titik 0 & cari jarak terjauh
  for (let i = 0; i < 21; i++) {
    const dx = landmarks[i].x - base.x;
    const dy = landmarks[i].y - base.y;
    const dz = (landmarks[i].z !== undefined ? landmarks[i].z : 0) - 
               (base.z !== undefined ? base.z : 0);

    relativeCoords.push({ dx, dy, dz });

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDistance) {
      maxDistance = dist;
    }
  }

  // Langkah 2: Penskalaan (Scale Invariance) & flattening ke array 63 elemen
  const normalizedFeatures = [];
  for (let i = 0; i < 21; i++) {
    const pt = relativeCoords[i];
    if (maxDistance > 0) {
      normalizedFeatures.push(pt.dx / maxDistance);
      normalizedFeatures.push(pt.dy / maxDistance);
      normalizedFeatures.push(pt.dz / maxDistance);
    } else {
      normalizedFeatures.push(0, 0, 0);
    }
  }

  return normalizedFeatures;
}

// Ekspos ke global window agar dapat langsung digunakan oleh app.js
if (typeof window !== 'undefined') {
  window.normalizeLandmarks = normalizeLandmarks;
}
