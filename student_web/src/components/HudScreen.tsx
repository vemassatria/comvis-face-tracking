import { useEffect, useRef, useState } from 'react';
import { Camera, AlertTriangle, ShieldCheck, Activity, Maximize2, Users, MicOff, Video, MessageSquare, Hand, PhoneOff } from 'lucide-react';
import { StudentSessionData } from '../App';
import { api } from '../api';
import { FaceAnalyzer, TelemetryData } from '../lib/FaceAnalyzer';
import { AlertCircle } from 'lucide-react';

interface Props {
  session: StudentSessionData;
  onEndSession: () => void;
}

export default function HudScreen({ session, onEndSession }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<FaceAnalyzer | null>(null);
  const requestRef = useRef<number>();
  
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [penaltyText, setPenaltyText] = useState('');
  
  // State for logic
  const lossFocusStartTime = useRef<number>(0);
  const focusLossType = useRef<string>('');

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Camera access denied", e);
      }
    };

    const initAI = async () => {
      const analyzer = new FaceAnalyzer();
      await analyzer.init();
      if (active) {
        analyzerRef.current = analyzer;
        startCamera();
      }
    };

    initAI();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !analyzerRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const data = analyzerRef.current.detect(video, performance.now());
      setTelemetry(data);

      if (data.box) {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(data.box.xMin, data.box.yMin, data.box.width, data.box.height);
        
        // Target crosshair style
        ctx.beginPath();
        ctx.moveTo(data.box.xMin + data.box.width / 2, data.box.yMin + data.box.height / 2 - 10);
        ctx.lineTo(data.box.xMin + data.box.width / 2, data.box.yMin + data.box.height / 2 + 10);
        ctx.moveTo(data.box.xMin + data.box.width / 2 - 10, data.box.yMin + data.box.height / 2);
        ctx.lineTo(data.box.xMin + data.box.width / 2 + 10, data.box.yMin + data.box.height / 2);
        ctx.strokeStyle = data.color + '80'; // 50% opacity
        ctx.stroke();
      }

      // Penalty logic
      handlePenaltyLogic(data.valStatus);
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', () => {
        requestRef.current = requestAnimationFrame(predictWebcam);
      });
    }
  }, []);

  const penaltySent = useRef<boolean>(false);

  const handlePenaltyLogic = (valStatus: string) => {
    const now = Date.now();
    const TIME_THRESHOLD = 5; // Toleransi pelanggaran 5 detik

    if (valStatus !== "") {
      if (lossFocusStartTime.current === 0 || focusLossType.current !== valStatus) {
        // Log previous if it changed without returning to focus
        if (lossFocusStartTime.current > 0 && !penaltySent.current) {
          let prevDur = Math.floor((now - lossFocusStartTime.current) / 1000);
          if (prevDur >= TIME_THRESHOLD) {
            api.sendLogAtensi(session.pin, session.nis, prevDur, focusLossType.current, "Sistem AI Web Deteksi Baru").catch(console.error);
          }
        }
        lossFocusStartTime.current = now;
        focusLossType.current = valStatus;
        penaltySent.current = false;
      }

      let dur = Math.floor((now - lossFocusStartTime.current) / 1000);
      if (dur > 0) setPenaltyText(`WAKTU PENALTI: ${dur} Detik`);
      else setPenaltyText("");

      // Send IMMEDIATELY when threshold is reached
      if (dur >= TIME_THRESHOLD && !penaltySent.current) {
        api.sendLogAtensi(session.pin, session.nis, dur, focusLossType.current, "Sistem AI Web Deteksi Baru").catch(console.error);
        penaltySent.current = true; // Mark as sent so we don't spam
      }

    } else {
      if (lossFocusStartTime.current > 0 && !penaltySent.current) {
        let dur = Math.floor((now - lossFocusStartTime.current) / 1000);
        if (dur >= TIME_THRESHOLD) {
          api.sendLogAtensi(session.pin, session.nis, dur, focusLossType.current, "Sistem AI Web Deteksi Baru").catch(console.error);
        }
      }
      lossFocusStartTime.current = 0;
      focusLossType.current = "";
      penaltySent.current = false;
      setPenaltyText("");
    }
  };

  const handleEndClass = async () => {
    if (lossFocusStartTime.current > 0) {
      let dur = Math.floor((Date.now() - lossFocusStartTime.current) / 1000);
      if (dur >= 4) {
        await api.sendLogAtensi(session.pin, session.nis, dur, focusLossType.current, "Sistem AI Web (Sesi Berakhir)")
                 .catch(console.error);
      }
    }
    onEndSession();
  };

  // Dummy participants for the mock meeting UI
  const dummyParticipants = [
    { name: session.namaGuru || 'Guru (Host)', initial: 'G', isHost: true },
    { name: 'Ahmad Budi', initial: 'A' },
    { name: 'Siti Rahma', initial: 'S' },
    { name: 'Reza Oktovian', initial: 'R' },
    { name: 'Putri Ayu', initial: 'P' }
  ];

  return (
        {penaltyText && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-fade-in flex flex-col items-center">
            <AlertCircle size={48} className="text-danger-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <h2 className="text-3xl md:text-5xl font-black text-danger-500 tracking-wider font-mono drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] bg-slate-900/40 px-6 py-2 rounded-xl backdrop-blur-sm border border-danger-500/30">
              {penaltyText}
            </h2>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="flex justify-between items-end">
          <div className="glass-panel px-5 py-4 border-l-4 border-l-primary-500 font-mono text-xs text-slate-300 space-y-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="text-primary-400 font-bold mb-2 tracking-wider flex items-center gap-1.5"><Maximize size={14}/> TELEMETRY DATA</div>
            <div className="flex justify-between gap-8"><span>EAR (Mata)</span> <span className="text-white">{telemetry?.emaEar.toFixed(2) || '-'}</span></div>
            <div className="flex justify-between gap-8"><span>MAR (Mulut)</span> <span className="text-white">{telemetry?.emaMar.toFixed(2) || '-'}</span></div>
            <div className="flex justify-between gap-8"><span>Jarak</span> <span className="text-white">{telemetry?.proximityStatus || '-'}</span></div>
            <div className="flex justify-between gap-8"><span>Kedipan</span> <span className="text-white">{telemetry?.blinkCount || '0'}</span></div>
            <div className="flex justify-between gap-8"><span>Arah Mata</span> <span className="text-white">{telemetry?.gazeDirection || '-'}</span></div>
          </div>
          
          <button 
            onClick={handleEndClass} 
            className="btn-danger pointer-events-auto backdrop-blur-md bg-danger-600/80 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            Akhiri Sesi
          </button>
        </div>
      </div>

    </div>
  );
}
