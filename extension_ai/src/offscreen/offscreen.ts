import { FaceAnalyzer } from '../lib/FaceAnalyzer';

const API_BASE_URL = 'https://comvis-face-tracking.onrender.com/api';
let analyzer: FaceAnalyzer | null = null;
let stream: MediaStream | null = null;
let requestRef = 0;

// Penalty tracking
let lossFocusStartTime = 0;
let penaltySent = false;
let currentStudentData: any = null;

async function startCamera() {
  const video = document.getElementById('videoElement') as HTMLVideoElement;
  if (!video) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, frameRate: 15 } 
    });
    video.srcObject = stream;
    
    // Play video
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });

    // Initialize Analyzer
    analyzer = await FaceAnalyzer.create();

    const loop = async () => {
      if (analyzer && video.readyState >= 2) {
        const result = await analyzer.analyze(video);
        handleLogic(result.status);
      }
      requestRef = requestAnimationFrame(loop);
    };
    loop();

  } catch (error) {
    console.error('Offscreen camera error:', error);
  }
}

function handleLogic(valStatus: string) {
  const now = Date.now();
  const TIME_THRESHOLD = 4; // seconds

  if (valStatus !== "") {
    if (lossFocusStartTime === 0) {
      lossFocusStartTime = now;
      penaltySent = false;
    } else {
      const elapsed = (now - lossFocusStartTime) / 1000;
      if (elapsed >= TIME_THRESHOLD && !penaltySent) {
        // Send to API
        sendLog(elapsed, 'Perhatian Hilang', `Siswa terdeteksi: ${valStatus}`);
        penaltySent = true;
      }
    }
  } else {
    // Reset
    lossFocusStartTime = 0;
    penaltySent = false;
  }
}

async function sendLog(durasi_detik: number, kategori: string, keterangan: string) {
  if (!currentStudentData) return;
  const { pin, nis } = currentStudentData;
  if (!pin || !nis) return;

  try {
    await fetch(`${API_BASE_URL}/log-atensi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_sesi: pin,
        nis,
        durasi_detik: Math.round(durasi_detik),
        kategori,
        keterangan
      })
    });
  } catch (err) {
    console.error('Gagal mengirim log:', err);
  }
}

// Load student data from storage
chrome.storage.local.get(['studentData'], (res) => {
  if (res.studentData) {
    currentStudentData = res.studentData;
  }
});

// Start immediately when the offscreen document is created
startCamera();

// Listen for studentData updates just in case
chrome.storage.onChanged.addListener((changes) => {
  if (changes.studentData) {
    currentStudentData = changes.studentData.newValue;
  }
});
