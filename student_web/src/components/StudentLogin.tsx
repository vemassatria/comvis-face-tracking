import React, { useState } from 'react';
import { api } from '../api';
import { StudentSessionData } from '../App';
import { User, Hash, KeyRound, Loader2, Target } from 'lucide-react';

interface Props {
  onLogin: (data: StudentSessionData) => void;
}

export default function StudentLogin({ onLogin }: Props) {
  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !nis || !pin) {
      setError('Harap isi semua bidang.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.checkSession(pin);
      if (res.status === 'not_found' || res.status === 'closed') {
        setError(res.message || 'Sesi tidak valid atau telah ditutup.');
        setIsLoading(false);
        return;
      }

      await api.registerStudent(nis, nama);
      onLogin({ nama, nis, pin, mataPelajaran: res.mata_pelajaran || 'KELAS UMUM' });
    } catch (err) {
      console.error(err);
      setError('Gagal terhubung ke server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      {/* Decorative background blurs */}
      <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-primary-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center mb-4 text-primary-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Target size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">ClassInsight</h1>
          <p className="text-primary-400 mt-1 uppercase text-sm tracking-widest font-semibold">Portal Akses Siswa</p>
        </div>

        {error && (
          <div className="bg-danger-500/20 border border-danger-500/50 text-danger-300 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">Nama Lengkap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <User size={20} />
              </div>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="input-field pl-11"
                placeholder="Masukkan nama Anda"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">NIS (Nomor Induk Siswa)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Hash size={20} />
              </div>
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className="input-field pl-11 font-mono tracking-wider"
                placeholder="Contoh: 210984"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">PIN Kelas</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <KeyRound size={20} />
              </div>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input-field pl-11 font-mono tracking-widest text-primary-300"
                placeholder="Dari Guru"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
            <span>{isLoading ? 'Memeriksa Sesi...' : 'Mulai Sesi Kelas'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
