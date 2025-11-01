/**
 * Meeting History Component
 * View and export past meeting sessions
 */

import { useState, useEffect } from 'react';
import { storageService } from '../services/storage-service';
import type { MeetingSession } from '../types';

export function MeetingHistory() {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<MeetingSession | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const loadedSessions = storageService.getAllSessions();
    setSessions(loadedSessions);
  };

  const handleExportMarkdown = (session: MeetingSession) => {
    const markdown = storageService.exportSessionAsMarkdown(session);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${session.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = storageService.exportSessions();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meetings-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      storageService.deleteSession(id);
      loadSessions();
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Meeting History</h1>
        <button onClick={handleExportJSON} style={styles.exportAllButton}>
          Export All (JSON)
        </button>
      </header>

      <div style={styles.content}>
        {/* Sessions List */}
        <div style={styles.sessionsList}>
          {sessions.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No meetings yet. Start your first meeting to see it here!</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  ...styles.sessionCard,
                  ...(selectedSession?.id === session.id ? styles.sessionCardActive : {})
                }}
                onClick={() => setSelectedSession(session)}
              >
                <div style={styles.sessionHeader}>
                  <h3 style={styles.sessionTitle}>
                    {session.title || `Meeting ${session.id.slice(0, 8)}`}
                  </h3>
                  <span style={styles.sessionDate}>{formatDate(session.startTime)}</span>
                </div>
                <div style={styles.sessionStats}>
                  <span>⏱️ {formatDuration(session.duration)}</span>
                  <span>💬 {session.transcript.length} messages</span>
                  <span>💡 {session.insights.length} insights</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Session Detail */}
        {selectedSession && (
          <div style={styles.sessionDetail}>
            <div style={styles.detailHeader}>
              <h2 style={styles.detailTitle}>
                {selectedSession.title || `Meeting ${selectedSession.id.slice(0, 8)}`}
              </h2>
              <div style={styles.detailActions}>
                <button
                  onClick={() => handleExportMarkdown(selectedSession)}
                  style={styles.actionButton}
                >
                  Export MD
                </button>
                <button
                  onClick={() => handleDelete(selectedSession.id)}
                  style={{ ...styles.actionButton, ...styles.deleteButton }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={styles.detailContent}>
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Transcript</h3>
                <div style={styles.transcriptList}>
                  {selectedSession.transcript.map((entry) => (
                    <div key={entry.id} style={styles.transcriptEntry}>
                      <strong>{entry.speaker}:</strong> {entry.content}
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Insights</h3>
                <div style={styles.insightsList}>
                  {selectedSession.insights.map((insight) => (
                    <div key={insight.id} style={styles.insightItem}>
                      <strong style={styles.insightType}>{insight.type}:</strong> {insight.content}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
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
    padding: '1.5rem',
    backgroundColor: '#1f2937',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  exportAllButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  sessionsList: {
    width: '350px',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e7eb',
    overflowY: 'auto',
    padding: '1rem'
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280'
  },
  sessionCard: {
    padding: '1rem',
    marginBottom: '0.75rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sessionCardActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6'
  },
  sessionHeader: {
    marginBottom: '0.5rem'
  },
  sessionTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827'
  },
  sessionDate: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  sessionStats: {
    display: 'flex',
    gap: '0.75rem',
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  sessionDetail: {
    flex: 1,
    backgroundColor: 'white',
    overflowY: 'auto'
  },
  detailHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827'
  },
  detailActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },
  detailContent: {
    padding: '1.5rem'
  },
  section: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827'
  },
  transcriptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  transcriptEntry: {
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    color: '#374151'
  },
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  insightItem: {
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    color: '#374151'
  },
  insightType: {
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    color: '#6b7280'
  }
};
