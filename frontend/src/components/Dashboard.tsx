/**
 * Dashboard Component
 * Main meeting interface with split-panel layout
 */

import { useState, useEffect } from 'react';
import { useRealtimeSession } from '../hooks/useRealtimeSession';
import { MeetingControls } from './MeetingControls';
import { TranscriptPanel } from './TranscriptPanel';
import { InsightsPanel } from './InsightsPanel';

export function Dashboard() {
  const {
    status,
    transcript,
    insights,
    error,
    isConnected,
    currentSession,
    startMeeting,
    endMeeting,
    pauseMeeting,
    resumeMeeting
  } = useRealtimeSession();

  const [sessionDuration, setSessionDuration] = useState(0);

  // Update session duration every second when active
  useEffect(() => {
    if (status === 'active' && currentSession) {
      const interval = setInterval(() => {
        const duration = Math.floor((Date.now() - currentSession.startTime) / 1000);
        setSessionDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setSessionDuration(0);
    }
  }, [status, currentSession]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>Meetings Agent</h1>
          <p style={styles.tagline}>Your B2B Strategy Assistant</p>
        </div>
        {isConnected && (
          <div style={styles.connectedBadge}>
            <div style={styles.connectedDot} />
            Connected
          </div>
        )}
      </header>

      {/* Meeting Controls */}
      <MeetingControls
        status={status}
        onStart={startMeeting}
        onEnd={endMeeting}
        onPause={pauseMeeting}
        onResume={resumeMeeting}
        error={error}
        sessionDuration={sessionDuration}
      />

      {/* Main Content: Split Panel */}
      <div style={styles.mainContent}>
        {/* Left: Transcript */}
        <div style={styles.panel}>
          <TranscriptPanel transcript={transcript} />
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Right: Insights */}
        <div style={styles.panel}>
          <InsightsPanel insights={insights} />
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Powered by OpenAI Realtime API • Data stored locally in your browser
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f3f4f6'
  },
  header: {
    padding: '1rem 1.5rem',
    backgroundColor: '#1f2937',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white'
  },
  tagline: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  connectedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#10b981'
  },
  connectedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 2s infinite'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0
  },
  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  divider: {
    width: '1px',
    backgroundColor: '#d1d5db',
    flexShrink: 0
  },
  footer: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  footerText: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#6b7280'
  }
};
