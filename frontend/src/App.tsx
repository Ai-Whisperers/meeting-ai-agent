/**
 * Main App Component
 * Handles navigation between Dashboard and Meeting History
 */

import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { MeetingHistory } from './components/MeetingHistory';

type View = 'dashboard' | 'history';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <button
          onClick={() => setCurrentView('dashboard')}
          style={{
            ...styles.navButton,
            ...(currentView === 'dashboard' ? styles.navButtonActive : {})
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setCurrentView('history')}
          style={{
            ...styles.navButton,
            ...(currentView === 'history' ? styles.navButtonActive : {})
          }}
        >
          📚 History
        </button>
      </nav>

      {/* Main Content */}
      <div style={styles.content}>
        {currentView === 'dashboard' ? <Dashboard /> : <MeetingHistory />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f3f4f6'
  },
  nav: {
    width: '200px',
    backgroundColor: '#1f2937',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  navButton: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    textAlign: 'left',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  navButtonActive: {
    backgroundColor: '#374151',
    color: 'white'
  },
  content: {
    flex: 1,
    overflow: 'hidden'
  }
};

export default App;
