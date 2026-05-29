import { useState } from 'react';
import PortalScreen from './components/PortalScreen';
import DashboardPage from './components/DashboardPage';

export interface SessionData {
  idSesi: string;
  namaGuru: string;
  isSelesai: boolean;
}

function App() {
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  const handleEnterDashboard = (sessionData: SessionData) => {
    setCurrentSession(sessionData);
  };

  const handleLeaveDashboard = () => {
    setCurrentSession(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-100 blur-[120px] opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[120px] opacity-60 pointer-events-none"></div>
      
      <main className="flex-1 flex flex-col relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8">
        {!currentSession ? (
          <PortalScreen onEnterDashboard={handleEnterDashboard} />
        ) : (
          <DashboardPage sessionData={currentSession} onLeave={handleLeaveDashboard} />
        )}
      </main>
    </div>
  );
}

export default App;
