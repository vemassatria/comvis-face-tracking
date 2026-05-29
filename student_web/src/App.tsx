import { useState } from 'react';
import StudentLogin from './components/StudentLogin';
import HudScreen from './components/HudScreen';

export interface StudentSessionData {
  nama: string;
  nis: string;
  pin: string;
  mataPelajaran: string;
}

function App() {
  const [session, setSession] = useState<StudentSessionData | null>(null);

  return (
    <div className="w-full h-screen relative bg-background overflow-hidden">
      {!session ? (
        <StudentLogin onLogin={(data) => setSession(data)} />
      ) : (
        <HudScreen session={session} onEndSession={() => setSession(null)} />
      )}
    </div>
  );
}

export default App;
