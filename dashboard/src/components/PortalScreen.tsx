import { useState, useEffect } from 'react';
import { api } from '../api';
import { SessionData } from '../App';
import { ShieldCheck, User, BookOpen, KeyRound, PlusCircle, ArrowRight, Loader2 } from 'lucide-react';

interface PortalScreenProps {
  onEnterDashboard: (session: SessionData) => void;
}

export default function PortalScreen({ onEnterDashboard }: PortalScreenProps) {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isCreatingState, setIsCreatingState] = useState(false);
  
  const [guruName, setGuruName] = useState('');
  const [mapel, setMapel] = useState('');
  const [kelasManual, setKelasManual] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [isCreatingState]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchActiveSessions();
      setActiveSessions(data || []);
      if (data && data.length > 0) {
        setSelectedSession(data[0].id_sesi.toString());
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuatKelasBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruName.trim() || !mapel.trim()) {
      setError('Harap isi Nama Guru dan Mata Pelajaran!');
      return;
    }

    const newPin = (10000 + Math.floor(Math.random() * 90000)).toString();
    setIsLoading(true);
    setError('');

    try {
      await api.createClassSession(newPin, mapel, guruName);
      onEnterDashboard({ idSesi: newPin, namaGuru: guruName, isSelesai: false });
    } catch (err) {
      console.error(err);
      setError('Gagal membuat kelas. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handleMasukDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSession = kelasManual.trim() || selectedSession;

    if (!guruName.trim()) {
      setError('Harap masukkan Identitas Guru!');
      return;
    }
    if (!finalSession) {
      setError('Pilih atau ketik Kode PIN Kelas!');
      return;
    }

    setIsLoading(true);
    setError('');
    let isClosed = false;

    try {
      const checkRes = await api.checkSession(finalSession);
      if (checkRes.status === 'not_found') {
        setError('PIN tidak ditemukan di Database!');
        setIsLoading(false);
        return;
      }
      isClosed = checkRes.status === 'closed';

      if (!isClosed) {
        await api.updateTeacher(finalSession, guruName);
      }

      onEnterDashboard({ idSesi: finalSession, namaGuru: guruName, isSelesai: isClosed });
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat masuk kelas.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center animate-fade-in py-12">
      <div className="glass-panel w-full max-w-lg p-8 md:p-10 relative overflow-hidden">
        {/* Decorative corner blur */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-200 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <ShieldCheck size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 text-center">Portal Administrator</h1>
          <p className="text-slate-500 mt-2 text-center">Silakan kelola kelas pintar Anda</p>
        </div>

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-2">
            <span className="font-semibold mt-0.5">!</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={isCreatingState ? handleBuatKelasBaru : handleMasukDashboard} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Identitas Guru</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={guruName}
                onChange={(e) => setGuruName(e.target.value)}
                className="input-field pl-11"
                placeholder="Masukkan nama Anda..."
              />
            </div>
          </div>

          {isCreatingState ? (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">Nama Mata Pelajaran</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <BookOpen size={20} />
                  </div>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    className="input-field pl-11"
                    placeholder="Contoh: Matematika"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button type="submit" disabled={isLoading} className="btn-success w-full">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
                  <span>Buat Kelas Baru & Masuk</span>
                </button>
                <button type="button" onClick={() => setIsCreatingState(false)} className="btn-secondary w-full text-slate-500 hover:text-slate-700">
                  Batal (Kembali)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {isLoading && activeSessions.length === 0 ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-primary-500" size={28} />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">Pilih Kelas Aktif (PIN)</label>
                    {activeSessions.length > 0 ? (
                      <select
                        value={selectedSession}
                        onChange={(e) => {
                          setSelectedSession(e.target.value);
                          setKelasManual('');
                        }}
                        className="input-field"
                      >
                        {activeSessions.map((sesi) => (
                          <option key={sesi.id_sesi} value={sesi.id_sesi}>
                            PIN {sesi.id_sesi} - {sesi.mata_pelajaran}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm text-center">
                        Belum ada kelas terbuka saat ini.
                      </div>
                    )}
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">Atau Akses Riwayat</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">Ketik PIN Kelas Manual</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <KeyRound size={20} />
                      </div>
                      <input
                        type="text"
                        value={kelasManual}
                        onChange={(e) => {
                          setKelasManual(e.target.value);
                          if (e.target.value) setSelectedSession('');
                        }}
                        className="input-field pl-11 font-mono tracking-wider"
                        placeholder="Contoh: 12345"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                  <span>Pantau Kelas / Riwayat</span>
                </button>
                <button type="button" onClick={() => setIsCreatingState(true)} className="btn-secondary w-full text-success-600 border-success-200 hover:bg-success-50 hover:border-success-300">
                  Buat Kelas PIN Baru
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
