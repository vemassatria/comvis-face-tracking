import { useState, useEffect } from 'react';
import { SessionData } from '../App';
import { api } from '../api';
import { ArrowLeft, LogOut, ShieldAlert, AlertTriangle, Frown, CheckCircle2, History, KeyRound, User } from 'lucide-react';

interface DashboardPageProps {
  sessionData: SessionData;
  onLeave: () => void;
}

export default function DashboardPage({ sessionData, onLeave }: DashboardPageProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isEnding, setIsEnding] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    let interval: number | null = null;
    if (!sessionData.isSelesai) {
      interval = window.setInterval(fetchLogs, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionData.idSesi, sessionData.isSelesai]);

  const fetchLogs = async () => {
    try {
      const data = await api.fetchClassLogs(sessionData.idSesi);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const handleEndClass = async () => {
    setIsEnding(true);
    try {
      await api.closeSession(sessionData.idSesi);
      onLeave();
    } catch (err) {
      console.error('Failed to end class', err);
      setIsEnding(false);
      setShowConfirmEnd(false);
    }
  };

  const getLogStyle = (kategori: string) => {
    const k = kategori.toLowerCase();
    if (k.includes('mengantuk') || k.includes('tidak ada di tempat')) {
      return { bg: 'bg-danger-50', border: 'border-danger-200', icon: <ShieldAlert className="text-danger-500" size={28} />, title: 'text-danger-700' };
    }
    if (k.includes('menguap') || k.includes('teralih') || k.includes('menoleh') || k.includes('menunduk') || k.includes('berbicara')) {
      return { bg: 'bg-warning-50', border: 'border-warning-200', icon: <AlertTriangle className="text-warning-500" size={28} />, title: 'text-warning-700' };
    }
    if (k.includes('bosan') || k.includes('sedih')) {
      return { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Frown className="text-blue-500" size={28} />, title: 'text-blue-700' };
    }
    return { bg: 'bg-slate-50', border: 'border-slate-200', icon: <History className="text-slate-400" size={28} />, title: 'text-slate-700' };
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in relative z-10">
      <header className={`glass-panel p-4 md:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${sessionData.isSelesai ? 'bg-slate-50 border-slate-300 shadow-sm' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {sessionData.isSelesai ? (
              <>Riwayat Laporan <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-md ml-2 font-semibold">Selesai</span></>
            ) : (
              <>Monitoring Kelas <span className="bg-success-100 text-success-700 text-xs px-2 py-1 rounded-md ml-2 font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>Aktif</span></>
            )}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 font-medium">
            <span className="flex items-center gap-1.5"><KeyRound size={16} className="text-slate-400" /> PIN: <span className="text-slate-800 font-bold">{sessionData.idSesi}</span></span>
            <span className="flex items-center gap-1.5"><User size={16} className="text-slate-400" /> Guru: <span className="text-slate-800 font-bold">{sessionData.namaGuru}</span></span>
          </div>
        </div>

        <div>
          {sessionData.isSelesai ? (
            <button onClick={onLeave} className="btn-secondary">
              <ArrowLeft size={18} /> Kembali
            </button>
          ) : (
            <button onClick={() => setShowConfirmEnd(true)} className="btn-danger shadow-none">
              <LogOut size={18} /> Akhiri Kelas
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="glass-panel p-10 text-center max-w-md mx-auto transform hover:scale-[1.02] transition-transform duration-300">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={48} className="text-success-500" />
              </div>
              <h3 className="text-xl font-bold text-success-700 mb-2">Lingkungan Terkendali</h3>
              <p className="text-slate-500 mb-6 leading-relaxed">Belum ada aktivitas atensi merugikan yang terdeteksi dari siswa saat ini.</p>
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700">
                PIN Siswa: <span className="text-primary-600 text-lg tracking-wider font-mono">{sessionData.idSesi}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max pb-8">
            {logs.map((log, idx) => {
              const style = getLogStyle(log.kategori);
              return (
                <div key={idx} className={`rounded-xl border ${style.border} ${style.bg} p-5 shadow-sm transform hover:-translate-y-1 transition-all duration-200`}>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100/50">
                      {style.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg leading-tight mb-1 ${style.title}`}>{log.kategori}</h4>
                      <div className="flex flex-col gap-1 text-sm text-slate-600 mt-2">
                        <span className="font-semibold text-slate-800">Siswa: {log.nama_lengkap || 'Siswa'} ({log.nis})</span>
                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-200/50">
                          <span className="flex items-center gap-1"><History size={14} className="opacity-50" /> {log.durasi_detik} dtk</span>
                          <span className="text-xs font-medium opacity-70">{log.waktu_kejadian}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up">
            <div className="w-12 h-12 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Akhiri Sesi Kelas?</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Menyelesaikan sesi ini akan mencatat "Waktu Selesai" secara permanen di database dan menghapus PIN dari daftar aktif.
            </p>
            <div className="flex gap-3">
              <button disabled={isEnding} onClick={() => setShowConfirmEnd(false)} className="flex-1 btn-secondary">
                Batal
              </button>
              <button disabled={isEnding} onClick={handleEndClass} className="flex-1 btn-danger">
                {isEnding ? 'Menutup...' : 'Ya, Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
