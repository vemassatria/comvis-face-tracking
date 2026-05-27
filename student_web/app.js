import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// API Configuration
const API_BASE = 'http://localhost:5000'; // Default, might need to adjust based on deployment

// MediaPipe variables
let faceLandmarker;
let webcamRunning = false;
let video = document.getElementById("webcam");
let canvasElement = document.getElementById("output_canvas");
let canvasCtx = canvasElement.getContext("2d");

// User Session Data
let sessionData = {
    nama: '',
    nis: '',
    pin: ''
};

// Telemetry State
let emaEar = 0, emaMar = 0;
let emaInit = false;
let blinkCount = 0;
let isBlinking = false;
let lossFocusStartTime = 0;
let focusLossType = "";

// Landmarks indices
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];
const MOUTH = [78, 308, 82, 87, 13, 14, 312, 317];
const LEFT_IRIS = [474, 475, 476, 477];
const RIGHT_IRIS = [469, 470, 471, 472];

// Thresholds
const EAR_THRESHOLD = 0.28;
const MAR_YAWN_THRESHOLD = 0.55;
const TIME_THRESHOLD = 4; // seconds

// UI Elements
const statusText = document.getElementById('status-text');
const emotionText = document.getElementById('emotion-text');
const penaltyText = document.getElementById('penalty-text');
const teleEar = document.getElementById('tele-ear');
const teleMar = document.getElementById('tele-mar');
const teleJarak = document.getElementById('tele-jarak');
const teleKedipan = document.getElementById('tele-kedipan');
const teleArah = document.getElementById('tele-arah');

// Initialization
async function initMediaPipe() {
    try {
        statusText.innerText = "MENGUNDUH MODEL AI...";
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        
        console.log("MediaPipe initialized");
        statusText.innerText = "AI SIAP. MENUNGGU KAMERA...";
    } catch (error) {
        console.error("Failed to init MediaPipe:", error);
        statusText.innerText = "ERROR AI: " + error.message;
        statusText.style.color = "red";
    }
}


// Helpers
function calcDist(p1, p2, width, height) {
    return Math.sqrt(Math.pow((p1.x - p2.x) * width, 2) + Math.pow((p1.y - p2.y) * height, 2));
}

function calculateEAR(landmarks, indices, width, height) {
    const p = indices.map(i => landmarks[i]);
    const v1 = calcDist(p[1], p[5], width, height);
    const v2 = calcDist(p[2], p[4], width, height);
    const h = calcDist(p[0], p[3], width, height);
    return h !== 0 ? (v1 + v2) / (2.0 * h) : 0;
}

function calculateMAR(landmarks, indices, width, height) {
    const p = indices.map(i => landmarks[i]);
    const v1 = calcDist(p[2], p[3], width, height);
    const v2 = calcDist(p[4], p[5], width, height);
    const v3 = calcDist(p[6], p[7], width, height);
    const h = calcDist(p[0], p[1], width, height);
    return h !== 0 ? (v1 + v2 + v3) / (3.0 * h) : 0;
}

function calculateIrisCenter(landmarks, indices, width, height) {
    let sumX = 0, sumY = 0;
    indices.forEach(i => {
        sumX += landmarks[i].x * width;
        sumY += landmarks[i].y * height;
    });
    return { x: sumX / indices.length, y: sumY / indices.length };
}

function checkGaze(irisCenter, innerEye, outerEye) {
    const dInner = Math.sqrt(Math.pow(irisCenter.x - innerEye.x, 2) + Math.pow(irisCenter.y - innerEye.y, 2));
    const dOuter = Math.sqrt(Math.pow(irisCenter.x - outerEye.x, 2) + Math.pow(irisCenter.y - outerEye.y, 2));
    const ratio = dOuter > 0 ? dInner / dOuter : 1;
    
    // Adjusted because video is mirrored
    if (ratio < 0.6) return "KIRI";
    else if (ratio > 1.6) return "KANAN";
    else return "TENGAH";
}

// Prediction Loop
let lastVideoTime = -1;
async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        if (faceLandmarker) {
            const results = faceLandmarker.detectForVideo(video, performance.now());
            processResults(results);
        }
    }
    
    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function processResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const w = canvasElement.width;
    const h = canvasElement.height;
    
    let isAbsent = true;
    let isSleepy = false, isYawning = false, isTurned = false, isLookingDown = false, isTalking = false;
    let proximityStatus = "OPTIMAL";
    let gazeDirection = "TENGAH";
    let emotion = "NETRAL";
    
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        isAbsent = false;
        const lm = results.faceLandmarks[0];
        
        // EAR
        const lEar = calculateEAR(lm, LEFT_EYE, w, h);
        const rEar = calculateEAR(lm, RIGHT_EYE, w, h);
        const avgEar = (lEar + rEar) / 2.0;
        
        if (!emaInit) { emaEar = avgEar; }
        else { emaEar = 0.4 * avgEar + 0.6 * emaEar; }
        
        if (emaEar < EAR_THRESHOLD) {
            isSleepy = true;
            if (!isBlinking) isBlinking = true;
        } else {
            if (isBlinking) {
                blinkCount++;
                isBlinking = false;
            }
        }
        
        // MAR
        const rawMar = calculateMAR(lm, MOUTH, w, h);
        if (!emaInit) { emaMar = rawMar; emaInit = true; }
        else { emaMar = 0.3 * rawMar + 0.7 * emaMar; }
        
        if (emaMar > MAR_YAWN_THRESHOLD) isYawning = true;
        
        // Face Bounds & Proximity
        let xMin = w, yMin = h, xMax = 0, yMax = 0;
        lm.forEach(p => {
            let px = p.x * w, py = p.y * h;
            if (px < xMin) xMin = px;
            if (py < yMin) yMin = py;
            if (px > xMax) xMax = px;
            if (py > yMax) yMax = py;
        });
        
        const faceRatio = (xMax - xMin) / w;
        if (faceRatio > 0.45) proximityStatus = "TERLALU DEKAT";
        else if (faceRatio < 0.12) proximityStatus = "TERLALU JAUH";
        
        // Emotion
        const lipWidth = calcDist(lm[308], lm[78], w, h);
        const faceW = calcDist(lm[454], lm[234], w, h);
        const smileRatio = faceW > 0 ? lipWidth / faceW : 0;
        
        const lipCenterY = lm[14].y * h;
        const frownDiff = (((lm[308].y * h) - lipCenterY) + ((lm[78].y * h) - lipCenterY)) / 2.0;
        
        if (avgEar > 0.35 && emaMar > 0.15 && emaMar < 0.45) emotion = "TERKEJUT (KAGET)";
        else if (smileRatio > 0.42 && emaMar < 0.2) emotion = "SENYUM (BAHAGIA)";
        else if (frownDiff > 2.5) emotion = "SEDIH (MURUNG)";
        else if (emaEar > EAR_THRESHOLD && emaEar <= (EAR_THRESHOLD + 0.05) && emaMar < 0.1) emotion = "BOSAN (SAYU)";
        
        // Gaze
        if (lm.length >= 478) {
            const rIrisCenter = calculateIrisCenter(lm, RIGHT_IRIS, w, h);
            const rInner = { x: lm[133].x * w, y: lm[133].y * h };
            const rOuter = { x: lm[33].x * w, y: lm[33].y * h };
            gazeDirection = checkGaze(rIrisCenter, rInner, rOuter);
        }
        
        // Turn / Pitch
        const nose = lm[1], lei = lm[133], rei = lm[362];
        const dLeft = calcDist(nose, lei, w, h);
        const dRight = calcDist(nose, rei, w, h);
        const yawRatio = dRight > 0 ? dLeft / dRight : 0;
        if (yawRatio > 2.2 || yawRatio < 0.45) isTurned = true;
        
        const forehead = lm[10], chin = lm[152];
        const dUp = calcDist(nose, forehead, w, h);
        const dDown = calcDist(nose, chin, w, h);
        const pitchRatio = dDown > 0 ? dUp / dDown : 0;
        if (pitchRatio > 1.6) isLookingDown = true;
        
        isTalking = emaMar > 0.12 && emaMar < 0.50 && !["SENYUM (BAHAGIA)", "TERKEJUT (KAGET)"].includes(emotion);
        
        // Draw HUD Box
        canvasCtx.strokeStyle = "#4ade80";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(xMin - 10, yMin - 20, xMax - xMin + 20, yMax - yMin + 40);
    }
    
    canvasCtx.restore();
    
    // Status Logic
    let valStatus = "";
    let sText = "SISTEM: NORMAL [FOKUS]";
    let sColor = "#4ade80";
    
    if (isAbsent) {
        sText = "KRITIKAL: TARGET HILANG!"; sColor = "#ef4444"; valStatus = "Tidak Ada Di Tempat";
    } else if (proximityStatus !== "OPTIMAL") {
        sText = `PERINGATAN: JARAK ${proximityStatus}!`; sColor = "#f59e0b"; valStatus = "Teralih/Menoleh";
    } else if (isSleepy) {
        sText = "KRITIKAL: MATA TERPEJAM!"; sColor = "#ef4444"; valStatus = "Mengantuk";
    } else if (isLookingDown) {
        sText = "PERINGATAN: MENUNDUK (FOKUS HILANG)!"; sColor = "#f59e0b"; valStatus = "Menunduk";
    } else if (isTurned) {
        sText = "PERINGATAN: TERALIH / MENOLEH!"; sColor = "#ef4444"; valStatus = "Teralih/Menoleh";
    } else if (isYawning) {
        sText = "PERINGATAN: MENGUAP!"; sColor = "#f59e0b"; valStatus = "Menguap";
    } else if (isTalking) {
        sText = "PERINGATAN: INDIKASI BERBICARA!"; sColor = "#f59e0b"; valStatus = "Berbicara";
    } else if (gazeDirection !== "TENGAH") {
        sText = `PERINGATAN: MELIRIK KE ${gazeDirection}!`; sColor = "#f59e0b"; valStatus = "Teralih/Menoleh";
    } else if (["BOSAN (SAYU)", "SEDIH (MURUNG)"].includes(emotion)) {
        sText = `PERINGATAN: PSIKOLOGIS - ${emotion}!`; sColor = "#3b82f6"; valStatus = emotion;
    } else {
        if (emotion === "SENYUM (BAHAGIA)") { sText = "SISTEM: PENGGUNA TERSENYUM :)"; sColor = "#fb7185"; }
        else if (emotion === "TERKEJUT (KAGET)") { sText = "SISTEM: PENGGUNA TERKEJUT :O"; sColor = "#22d3ee"; }
    }
    
    // Update DOM
    statusText.innerText = sText;
    statusText.style.color = sColor;
    statusText.style.borderColor = sColor;
    
    emotionText.innerText = `Emosi: ${emotion}`;
    
    teleEar.innerText = `EAR (Mata): ${emaEar.toFixed(2)}`;
    teleMar.innerText = `MAR (Mulut): ${emaMar.toFixed(2)}`;
    teleJarak.innerText = `Jarak: ${proximityStatus}`;
    teleKedipan.innerText = `Kedipan: ${blinkCount}`;
    teleArah.innerText = `Arah Mata: ${gazeDirection}`;
    
    // Penalty Logic
    const now = Date.now();
    if (valStatus !== "") {
        if (lossFocusStartTime === 0) {
            lossFocusStartTime = now;
            focusLossType = valStatus;
        } else if (focusLossType !== valStatus) {
            lossFocusStartTime = now;
            focusLossType = valStatus;
        }
        
        let dur = Math.floor((now - lossFocusStartTime) / 1000);
        if (dur > 0) penaltyText.innerText = `WAKTU PENALTI: ${dur} Detik`;
        else penaltyText.innerText = "";
        
    } else {
        if (lossFocusStartTime > 0) {
            let dur = Math.floor((now - lossFocusStartTime) / 1000);
            if (dur >= TIME_THRESHOLD) {
                sendLog(dur, focusLossType, "Sistem AI Web Deteksi Baru");
            }
        }
        lossFocusStartTime = 0;
        focusLossType = "";
        penaltyText.innerText = "";
    }
}

async function sendLog(durasi, kategori, keterangan) {
    console.log("SENDING LOG:", { durasi, kategori });
    try {
        await fetch(`${API_BASE}/api/log-atensi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_sesi: sessionData.pin,
                nis: sessionData.nis,
                durasi_detik: durasi,
                kategori: kategori,
                keterangan: keterangan
            })
        });
    } catch (e) {
        console.error("Gagal mengirim log:", e);
    }
}

// Login Logic
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-start');
    const err = document.getElementById('login-error');
    
    const nama = document.getElementById('nama').value;
    const nis = document.getElementById('nis').value;
    const pin = document.getElementById('pin').value;
    
    btn.disabled = true;
    btn.innerText = "Memeriksa Sesi...";
    err.innerText = "";
    
    try {
        const res = await fetch(`${API_BASE}/api/cek-sesi/${pin}`);
        const data = await res.json();
        
        if (data.status === 'not_found' || data.status === 'closed') {
            err.innerText = data.message || "Sesi tidak valid.";
            btn.disabled = false;
            btn.innerText = "Mulai Sesi Kelas";
            return;
        }
        
        // Register Student
        await fetch(`${API_BASE}/api/register-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nis, nama })
        });
        
        // Success
        sessionData = { nama, nis, pin };
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('hud-section').style.display = 'block';
        
        // Initialize MediaPipe if not already initialized
        if (!faceLandmarker) {
            await initMediaPipe();
        }

        
        // Start Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            webcamRunning = true;
            predictWebcam();
        });
        
    } catch (error) {
        err.innerText = "Gagal terhubung ke server.";
        btn.disabled = false;
        btn.innerText = "Mulai Sesi Kelas";
    }
});

document.getElementById('btn-stop').addEventListener('click', () => {
    // Send final log if any
    if (lossFocusStartTime > 0) {
        let dur = Math.floor((Date.now() - lossFocusStartTime) / 1000);
        if (dur >= TIME_THRESHOLD) {
            sendLog(dur, focusLossType, "Sistem AI Web (Sesi Berakhir)");
        }
    }
    window.location.reload();
});
