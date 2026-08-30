import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import ForResearchers from './pages/ForResearchers';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'research', label: 'For Researchers' },
];

function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <nav aria-label="Views" className="border-b border-border">
        <div className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              aria-current={view === tab.id ? 'page' : undefined}
              className={`min-h-11 cursor-pointer border-b-2 px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                view === tab.id
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-faint hover:text-ink-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {view === 'dashboard' ? <Dashboard /> : <ForResearchers />}
    </div>
  );
}

export default App;
