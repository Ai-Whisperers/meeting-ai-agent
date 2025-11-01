/**
 * Meeting Controls Component
 * Start/stop/pause controls for meetings
 */

import type { MeetingStatus } from '../types';

interface MeetingControlsProps {
  status: MeetingStatus;
  onStart: () => void;
  onEnd: () => void;
  onPause: () => void;
  onResume: () => void;
  error: string | null;
  sessionDuration?: number;
}

export function MeetingControls({
  status,
  onStart,
  onEnd,
  onPause,
  onResume,
  error,
  sessionDuration = 0
}: MeetingControlsProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = (): { text: string; color: string } => {
    switch (status) {
      case 'idle':
        return { text: 'Ready to start', color: '#6b7280' };
      case 'starting':
        return { text: 'Starting...', color: '#3b82f6' };
      case 'active':
        return { text: 'Recording', color: '#10b981' };
      case 'paused':
        return { text: 'Paused', color: '#f59e0b' };
      case 'ending':
        return { text: 'Ending...', color: '#ef4444' };
      case 'ended':
        return { text: 'Ended', color: '#6b7280' };
      default:
        return { text: 'Unknown', color: '#6b7280' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.statusContainer}>
          <div style={{ ...styles.statusDot, backgroundColor: statusInfo.color }} />
          <span style={styles.statusText}>{statusInfo.text}</span>
        </div>

        {status === 'active' && (
          <div style={styles.duration}>
            {formatDuration(sessionDuration)}
          </div>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={styles.controls}>
        {status === 'idle' && (
          <button onClick={onStart} style={{ ...styles.button, ...styles.startButton }}>
            Start Meeting
          </button>
        )}

        {status === 'active' && (
          <>
            <button onClick={onPause} style={{ ...styles.button, ...styles.pauseButton }}>
              Pause
            </button>
            <button onClick={onEnd} style={{ ...styles.button, ...styles.endButton }}>
              End Meeting
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button onClick={onResume} style={{ ...styles.button, ...styles.startButton }}>
              Resume
            </button>
            <button onClick={onEnd} style={{ ...styles.button, ...styles.endButton }}>
              End Meeting
            </button>
          </>
        )}

        {status === 'ended' && (
          <button onClick={onStart} style={{ ...styles.button, ...styles.startButton }}>
            New Meeting
          </button>
        )}
      </div>

      {status === 'starting' && (
        <div style={styles.instructions}>
          <p><strong>Please grant permissions:</strong></p>
          <ol style={styles.instructionsList}>
            <li>Select "Entire Screen" or specific window</li>
            <li>Check "Share system audio" (important!)</li>
            <li>Allow microphone access</li>
          </ol>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  statusText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937'
  },
  duration: {
    fontSize: '1.5rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#374151'
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  },
  controls: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center'
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  startButton: {
    backgroundColor: '#10b981',
    color: 'white'
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
    color: 'white'
  },
  endButton: {
    backgroundColor: '#ef4444',
    color: 'white'
  },
  instructions: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#dbeafe',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    color: '#1e40af'
  },
  instructionsList: {
    marginTop: '0.5rem',
    marginBottom: 0,
    paddingLeft: '1.5rem'
  }
};
