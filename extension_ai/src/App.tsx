import { useState, useEffect } from 'react';
import { Camera, ShieldCheck, Power, AlertTriangle } from 'lucide-react';

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check current state from background/storage
    chrome.storage.local.get(['isMonitoring', 'studentData'], (result) => {
      setIsMonitoring(!!result.isMonitoring);
      if (result.studentData) {
        setNis(result.studentData.nis || '');
        setNama(result.studentData.nama || '');
        setPin(result.studentData.pin || '');
      }
    });

    // Listen for state changes
    const listener = (changes: any) => {
      if (changes.isMonitoring) {
        setIsMonitoring(changes.isMonitoring.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isMonitoring) {
      if (!nis || !nama || !pin) {
        setError('Harap lengkapi semua data!');
        return;
      }
      
      // Request camera permission in the popup first so offscreen can use it
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop()); // Stop immediately
      } catch (err) {
        setError('Akses kamera ditolak. Berikan izin kamera terlebih dahulu.');
        return;
      }

      // Save student data
      chrome.storage.local.set({ studentData: { nis, nama, pin } });
      
      // Send message to background to start offscreen
      chrome.runtime.sendMessage({ action: 'START_MONITORING' });
    } else {
      chrome.runtime.sendMessage({ action: 'STOP_MONITORING' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-center gap-2">
        <ShieldCheck className="text-blue-500" size={24} />
        <h1 className="text-lg font-bold text-white tracking-wide">ClassInsight AI</h1>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 text-xs p-2 rounded mb-4 flex items-center gap-1">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className={`flex-1 flex flex-col items-center justify-center transition-all ${isMonitoring ? 'opacity-50 pointer-events-none' : ''}`}>
          <form onSubmit={handleToggle} className="w-full space-y-3" id="loginForm">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">NIS Siswa</label>
              <input type="text" value={nis} onChange={(e)=>setNis(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="Contoh: 101102" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Nama Lengkap</label>
              <input type="text" value={nama} onChange={(e)=>setNama(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="Nama Anda" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">PIN Kelas Aktif</label>
              <input type="text" value={pin} onChange={(e)=>setPin(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-sm outline-none focus:border-blue-500 font-mono tracking-widest" placeholder="12345" />
            </div>
          </form>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800">
          <button 
            type={isMonitoring ? 'button' : 'submit'} 
            form={!isMonitoring ? 'loginForm' : undefined}
            onClick={isMonitoring ? handleToggle : undefined}
            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${isMonitoring ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}
          >
            {isMonitoring ? <Power size={18} /> : <Camera size={18} />}
            {isMonitoring ? 'Hentikan AI' : 'Mulai Pantau Kelas'}
          </button>
          
          {isMonitoring && (
            <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
              AI sedang berjalan di latar belakang...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
