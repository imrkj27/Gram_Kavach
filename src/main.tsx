import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BookOpenText } from 'lucide-react';
import App from './App';
import AwarenessPage from './components/AwarenessPage';
import './index.css';

const Root: React.FC = () => {
  const [showAwareness, setShowAwareness] = useState(false);

  if (showAwareness) {
    return <AwarenessPage onBack={() => setShowAwareness(false)} />;
  }

  return (
    <>
      <App />
      <button
        type="button"
        onClick={() => setShowAwareness(true)}
        aria-label="మోసానికి గురైతే సహాయం / Scam help and awareness"
        title="మోసానికి గురైతే సహాయం / Scam help"
        className="fixed z-30 left-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:left-[calc(50%+300px)] sm:bottom-8 inline-flex items-center gap-1.5 rounded-full bg-[#075E54] hover:bg-[#054640] text-white shadow-lg border border-white/30 px-3 py-2 text-xs font-bold"
      >
        <BookOpenText className="w-4 h-4 text-[#D9FDD3]" />
        <span>సహాయం / Help</span>
      </button>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
