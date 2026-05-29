import { useEffect, useRef, useState } from 'react';
import { Maximize, AlertCircle, ShieldCheck, Activity, Users, MicOff, Video, MessageSquare, Hand, PhoneOff } from 'lucide-react';
import { StudentSessionData } from '../App';
import { api } from '../api';
import { FaceAnalyzer, TelemetryData } from '../lib/FaceAnalyzer';

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
    { name: 'Guru (Host)', initial: 'G', isHost: true },
    { name: 'Ahmad Budi', initial: 'A' },
    { name: 'Siti Rahma', initial: 'S' },
    { name: 'Reza Oktovian', initial: 'R' },
    { name: 'Putri Ayu', initial: 'P' }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#202124] overflow-hidden text-white font-sans">
      
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#202124]">
        <div className="flex flex-col">
          <span className="font-medium text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-400" />
            ClassInsight AI Meeting
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-slate-400">PIN KELAS: {session.pin}</span>
          <span className="text-blue-400 font-bold uppercase tracking-widest">{session.mataPelajaran || 'KELAS UMUM'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Main Video Area */}
        <div className="flex-1 relative bg-[#303134] rounded-xl m-4 overflow-hidden border border-[#3c4043] flex items-center justify-center">
          
          {/* AI HUD OVERLAY */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
            
            {/* Status Bar */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="glass-panel px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-mono font-semibold tracking-wider text-green-400">AI ACTIVE</span>
              </div>
              <div className="glass-panel px-3 py-1.5 flex items-center gap-2">
                <Activity size={14} className={telemetry?.valStatus ? "text-danger-400" : "text-green-400"} />
                <span className="text-xs font-mono">STATUS: {telemetry?.valStatus || 'FOKUS'}</span>
              </div>
            </div>

            {/* Video Streams */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Penalty Warning Overlay */}
            {penaltyText && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-fade-in flex flex-col items-center">
                <AlertCircle size={48} className="text-danger-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <h2 className="text-3xl md:text-5xl font-black text-danger-500 tracking-wider font-mono drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] bg-slate-900/40 px-6 py-2 rounded-xl backdrop-blur-sm border border-danger-500/30">
                  {penaltyText}
                </h2>
              </div>
            )}

            {/* Bottom Telemetry Bar */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="glass-panel px-5 py-4 border-l-4 border-l-primary-500 font-mono text-xs text-slate-300 space-y-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="text-primary-400 font-bold mb-2 tracking-wider flex items-center gap-1.5"><Maximize size={14}/> TELEMETRY DATA</div>
                <div className="flex justify-between gap-8"><span>EAR (Mata)</span> <span className="text-white">{telemetry?.emaEar.toFixed(2) || '-'}</span></div>
                <div className="flex justify-between gap-8"><span>MAR (Mulut)</span> <span className="text-white">{telemetry?.emaMar.toFixed(2) || '-'}</span></div>
                <div className="flex justify-between gap-8"><span>Jarak</span> <span className="text-white">{telemetry?.proximityStatus || '-'}</span></div>
                <div className="flex justify-between gap-8"><span>Kedipan</span> <span className="text-white">{telemetry?.blinkCount || '0'}</span></div>
                <div className="flex justify-between gap-8"><span>Arah Mata</span> <span className="text-white">{telemetry?.gazeDirection || '-'}</span></div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Sidebar - Other Participants */}
        <div className="w-full md:w-64 bg-[#202124] p-4 flex flex-col gap-2 overflow-y-auto">
          {dummyParticipants.map((p, idx) => (
            <div key={idx} className="relative aspect-video bg-[#3c4043] rounded-lg overflow-hidden flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-medium">
                {p.initial}
              </div>
              <div className="absolute bottom-2 left-2 bg-[#202124] px-2 py-0.5 rounded text-xs flex items-center gap-1">
                <MicOff size={12} className="text-red-400" />
                {p.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Controls */}
      <div className="flex items-center justify-center gap-4 py-4 bg-[#202124]">
        <button className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center hover:bg-[#4a4b4d] transition">
          <MicOff size={20} className="text-red-400" />
        </button>
        <button className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center hover:bg-[#4a4b4d] transition">
          <Video size={20} />
        </button>
        <button className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center hover:bg-[#4a4b4d] transition">
          <Hand size={20} />
        </button>
        <button className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center hover:bg-[#4a4b4d] transition">
          <MessageSquare size={20} />
        </button>
        <button className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center hover:bg-[#4a4b4d] transition">
          <Users size={20} />
        </button>
        <button 
          onClick={handleEndClass}
          className="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 font-medium flex items-center gap-2 transition ml-4 shadow-lg shadow-red-500/20"
        >
          <PhoneOff size={20} />
          Akhiri Sesi
        </button>
      </div>

    </div>
  );
}
