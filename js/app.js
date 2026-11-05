let model = null;
let labels = {};
let lastSpokenChar = "";
let predictionBuffer = [];
const BUFFER_SIZE = 12; // Prediksi harus konsisten 12 frame berturut-turut

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const predictedCharEl = document.getElementById('predicted-char');
const confidenceEl = document.getElementById('confidence-score');
const accumulatedTextEl = document.getElementById('accumulated-text');
const loadingOverlay = document.getElementById('loading-overlay');

// 1. Normalisasi Koordinat (Identik dengan versi Python)
function normalizeLandmarks(landmarks) {
  const base = landmarks[0];
  let relCoords = [];
  let maxDist = 0;

  // Hitung koordinat relatif terhadap pergelangan tangan (wrist / index 0)
  for (let i = 0; i < 21; i++) {
    const dx = landmarks[i].x - base.x;
    const dy = landmarks[i].y - base.y;
    const dz = landmarks[i].z - base.z;
    relCoords.push(dx, dy, dz);

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) maxDist = dist;
  }

  // Penskalaan dengan membagi jarak terjauh
  if (maxDist > 0) {
    relCoords = relCoords.map(val => val / maxDist);
  }
  return relCoords;
}

// 2. Fungsi Text-to-Speech
function speak(text) {
  if ('speechSynthesis' in window && text.trim().length > 0) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// 3. Muat Model TFJS dan Mapping Label
async function loadResources() {
  try {
    model = await tf.loadLayersModel('./model_web/model.json');
    const response = await fetch('./model_web/labels.json');
    labels = await response.json();
    loadingOverlay.style.display = 'none';
    console.log("Model dan label berhasil dimuat.");
  } catch (err) {
    loadingOverlay.innerText = "Gagal memuat model. Pastikan file model_web lengkap.";
    console.error(err);
  }
}

// 4. Callback Pemrosesan Landmark MediaPipe
async function onResults(results) {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && model) {
    const handLandmarks = results.multiHandLandmarks[0];

    // Gambar skeleton tangan
    drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
    drawLandmarks(canvasCtx, handLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

    // Inferensi model
    const inputVector = normalizeLandmarks(handLandmarks);
    const tensorInput = tf.tensor2d([inputVector]);
    const prediction = model.predict(tensorInput);
    const probabilities = await prediction.data();
    tensorInput.dispose();
    prediction.dispose();

    // Dapatkan label dengan probabilitas tertinggi
    const maxProb = Math.max(...probabilities);
    const predIndex = probabilities.indexOf(maxProb);
    const detectedLabel = labels[predIndex];

    if (maxProb > 0.75) {
      confidenceEl.innerText = `Akurasi: ${(maxProb * 100).toFixed(1)}%`;
      predictionBuffer.push(detectedLabel);
      if (predictionBuffer.length > BUFFER_SIZE) predictionBuffer.shift();

      // Debouncing: periksa apakah konsisten stabil
      const isStable = predictionBuffer.every(val => val === detectedLabel);
      if (isStable && predictionBuffer.length === BUFFER_SIZE) {
        predictedCharEl.innerText = detectedLabel;

        if (detectedLabel !== lastSpokenChar) {
          speak(detectedLabel);
          lastSpokenChar = detectedLabel;

          // Tambahkan ke rangkaian teks
          if (accumulatedTextEl.innerText === "Belum ada input...") {
            accumulatedTextEl.innerText = detectedLabel;
          } else {
            accumulatedTextEl.innerText += detectedLabel;
          }
        }
      }
    } else {
      confidenceEl.innerText = "Akurasi: Terlalu Rendah";
    }
  } else {
    predictionBuffer = [];
    predictedCharEl.innerText = "-";
    confidenceEl.innerText = "Akurasi: 0%";
  }
  canvasCtx.restore();
}

// 5. Inisialisasi MediaPipe Hands & Kamera
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

// Event Listener Tombol
document.getElementById('btn-speak').addEventListener('click', () => {
  const currentText = accumulatedTextEl.innerText;
  if (currentText !== "Belum ada input...") {
    speak(currentText);
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  accumulatedTextEl.innerText = "Belum ada input...";
  lastSpokenChar = "";
  predictionBuffer = [];
});

// Jalankan sistem
loadResources().then(() => {
  camera.start();
});
