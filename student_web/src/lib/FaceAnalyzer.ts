import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface TelemetryData {
  emaEar: number;
  emaMar: number;
  blinkCount: number;
  gazeDirection: string;
  proximityStatus: string;
  emotion: string;
  statusText: string;
  valStatus: string;
  color: string;
  box: { xMin: number; yMin: number; width: number; height: number } | null;
}

export class FaceAnalyzer {
  private faceLandmarker: FaceLandmarker | null = null;
  
  private emaEar = 0;
  private emaMar = 0;
  private emaInit = false;
  private blinkCount = 0;
  private isBlinking = false;
  
  // Constants
  private readonly EAR_THRESHOLD = 0.28;
  private readonly MAR_YAWN_THRESHOLD = 0.55;
  
  // Indices
  private readonly LEFT_EYE = [362, 385, 387, 263, 373, 380];
  private readonly RIGHT_EYE = [33, 160, 158, 133, 153, 144];
  private readonly MOUTH = [78, 308, 82, 87, 13, 14, 312, 317];
  private readonly RIGHT_IRIS = [469, 470, 471, 472];

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
  }

  private calcDist(p1: any, p2: any, width: number, height: number) {
    return Math.sqrt(Math.pow((p1.x - p2.x) * width, 2) + Math.pow((p1.y - p2.y) * height, 2));
  }

  private calculateAspect(landmarks: any[], indices: number[], width: number, height: number) {
    const p = indices.map(i => landmarks[i]);
    if (indices.length === 6) { // Eye
      const v1 = this.calcDist(p[1], p[5], width, height);
      const v2 = this.calcDist(p[2], p[4], width, height);
      const h = this.calcDist(p[0], p[3], width, height);
      return h !== 0 ? (v1 + v2) / (2.0 * h) : 0;
    } else { // Mouth
      const v1 = this.calcDist(p[2], p[3], width, height);
      const v2 = this.calcDist(p[4], p[5], width, height);
      const v3 = this.calcDist(p[6], p[7], width, height);
      const h = this.calcDist(p[0], p[1], width, height);
      return h !== 0 ? (v1 + v2 + v3) / (3.0 * h) : 0;
    }
  }

  private calculateIrisCenter(landmarks: any[], indices: number[], width: number, height: number) {
    let sumX = 0, sumY = 0;
    indices.forEach(i => {
      sumX += landmarks[i].x * width;
      sumY += landmarks[i].y * height;
    });
    return { x: sumX / indices.length, y: sumY / indices.length };
  }

  public detect(video: HTMLVideoElement, timestamp: number): TelemetryData {
    let result: TelemetryData = {
      emaEar: this.emaEar,
      emaMar: this.emaMar,
      blinkCount: this.blinkCount,
      gazeDirection: "TENGAH",
      proximityStatus: "OPTIMAL",
      emotion: "NETRAL",
      statusText: "SISTEM: NORMAL [FOKUS]",
      valStatus: "",
      color: "#10b981", // success
      box: null
    };

    if (!this.faceLandmarker) return { ...result, statusText: "MENGINISIALISASI SISTEM...", color: "#64748b" };

    const detection = this.faceLandmarker.detectForVideo(video, timestamp);
    const w = video.videoWidth;
    const h = video.videoHeight;

    if (!detection.faceLandmarks || detection.faceLandmarks.length === 0) {
      result.statusText = "KRITIKAL: TARGET HILANG!";
      result.color = "#ef4444";
      result.valStatus = "Tidak Ada Di Tempat";
      return result;
    }

    const lm = detection.faceLandmarks[0];

    // EAR
    const lEar = this.calculateAspect(lm, this.LEFT_EYE, w, h);
    const rEar = this.calculateAspect(lm, this.RIGHT_EYE, w, h);
    const avgEar = (lEar + rEar) / 2.0;

    if (!this.emaInit) { this.emaEar = avgEar; }
    else { this.emaEar = 0.4 * avgEar + 0.6 * this.emaEar; }

    let isSleepy = false;
    if (this.emaEar < this.EAR_THRESHOLD) {
      isSleepy = true;
      if (!this.isBlinking) this.isBlinking = true;
    } else {
      if (this.isBlinking) {
        this.blinkCount++;
        this.isBlinking = false;
      }
    }

    // MAR
    const rawMar = this.calculateAspect(lm, this.MOUTH, w, h);
    if (!this.emaInit) { this.emaMar = rawMar; this.emaInit = true; }
    else { this.emaMar = 0.3 * rawMar + 0.7 * this.emaMar; }

    const isYawning = this.emaMar > this.MAR_YAWN_THRESHOLD;

    // Bounds
    let xMin = w, yMin = h, xMax = 0, yMax = 0;
    lm.forEach((p: any) => {
      let px = p.x * w, py = p.y * h;
      if (px < xMin) xMin = px;
      if (py < yMin) yMin = py;
      if (px > xMax) xMax = px;
      if (py > yMax) yMax = py;
    });
    
    result.box = { xMin: xMin - 10, yMin: yMin - 20, width: xMax - xMin + 20, height: yMax - yMin + 40 };

    const faceRatio = (xMax - xMin) / w;
    if (faceRatio > 0.45) result.proximityStatus = "TERLALU DEKAT";
    else if (faceRatio < 0.12) result.proximityStatus = "TERLALU JAUH";

    // Emotion
    const lipWidth = this.calcDist(lm[308], lm[78], w, h);
    const faceW = this.calcDist(lm[454], lm[234], w, h);
    const smileRatio = faceW > 0 ? lipWidth / faceW : 0;
    const lipCenterY = lm[14].y * h;
    const frownDiff = (((lm[308].y * h) - lipCenterY) + ((lm[78].y * h) - lipCenterY)) / 2.0;

    if (avgEar > 0.35 && this.emaMar > 0.15 && this.emaMar < 0.45) result.emotion = "TERKEJUT (KAGET)";
    else if (smileRatio > 0.42 && this.emaMar < 0.2) result.emotion = "SENYUM (BAHAGIA)";
    else if (frownDiff > 2.5) result.emotion = "SEDIH (MURUNG)";
    else if (this.emaEar > this.EAR_THRESHOLD && this.emaEar <= (this.EAR_THRESHOLD + 0.05) && this.emaMar < 0.1) result.emotion = "BOSAN (SAYU)";

    // Gaze
    if (lm.length >= 478) {
      const rIrisCenter = this.calculateIrisCenter(lm, this.RIGHT_IRIS, w, h);
      const rInner = { x: lm[133].x * w, y: lm[133].y * h };
      const rOuter = { x: lm[33].x * w, y: lm[33].y * h };
      const dInner = Math.sqrt(Math.pow(rIrisCenter.x - rInner.x, 2) + Math.pow(rIrisCenter.y - rInner.y, 2));
      const dOuter = Math.sqrt(Math.pow(rIrisCenter.x - rOuter.x, 2) + Math.pow(rIrisCenter.y - rOuter.y, 2));
      const ratio = dOuter > 0 ? dInner / dOuter : 1;
      if (ratio < 0.6) result.gazeDirection = "KIRI";
      else if (ratio > 1.6) result.gazeDirection = "KANAN";
    }

    // Turn / Pitch
    const nose = lm[1], lei = lm[133], rei = lm[362];
    const dLeft = this.calcDist(nose, lei, w, h);
    const dRight = this.calcDist(nose, rei, w, h);
    const yawRatio = dRight > 0 ? dLeft / dRight : 0;
    const isTurned = yawRatio > 2.2 || yawRatio < 0.45;

    const forehead = lm[10], chin = lm[152];
    const dUp = this.calcDist(nose, forehead, w, h);
    const dDown = this.calcDist(nose, chin, w, h);
    const pitchRatio = dDown > 0 ? dUp / dDown : 0;
    const isLookingDown = pitchRatio > 1.6;

    const isTalking = this.emaMar > 0.12 && this.emaMar < 0.50 && !["SENYUM (BAHAGIA)", "TERKEJUT (KAGET)"].includes(result.emotion);

    // Final Status Logic
    if (result.proximityStatus !== "OPTIMAL") {
      result.statusText = "Teralih / Jarak Wajah Tidak Optimal"; result.color = "#f59e0b"; result.valStatus = "Teralih / Jarak Wajah Tidak Optimal";
    } else if (isSleepy) {
      result.statusText = "Mata Terpejam / Mengantuk"; result.color = "#ef4444"; result.valStatus = "Mata Terpejam / Mengantuk";
    } else if (isLookingDown) {
      result.statusText = "Menunduk / Kehilangan Fokus"; result.color = "#f59e0b"; result.valStatus = "Menunduk / Kehilangan Fokus";
    } else if (isTurned) {
      result.statusText = "Menoleh / Teralih"; result.color = "#ef4444"; result.valStatus = "Menoleh / Teralih";
    } else if (isYawning) {
      result.statusText = "Menguap"; result.color = "#f59e0b"; result.valStatus = "Menguap";
    } else if (isTalking) {
      result.statusText = "Terindikasi Berbicara"; result.color = "#f59e0b"; result.valStatus = "Terindikasi Berbicara";
    } else if (result.gazeDirection !== "TENGAH") {
      result.statusText = `Melirik ke arah ${result.gazeDirection}`; result.color = "#f59e0b"; result.valStatus = `Melirik ke arah ${result.gazeDirection}`;
    } else if (["BOSAN (SAYU)", "SEDIH (MURUNG)"].includes(result.emotion)) {
      result.statusText = `Emosi: ${result.emotion}`; result.color = "#3b82f6"; result.valStatus = `Emosi: ${result.emotion}`;
    } else {
      if (result.emotion === "SENYUM (BAHAGIA)") { result.statusText = "Fokus & Tersenyum"; result.color = "#10b981"; }
      else if (result.emotion === "TERKEJUT (KAGET)") { result.statusText = "Terkejut"; result.color = "#22d3ee"; }
      else { result.statusText = "Fokus Normal"; result.color = "#10b981"; }
    }

    result.emaEar = this.emaEar;
    result.emaMar = this.emaMar;
    result.blinkCount = this.blinkCount;

    return result;
  }
}
