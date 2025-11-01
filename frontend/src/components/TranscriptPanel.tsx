/**
 * Transcript Panel Component
 * Displays live meeting transcript
 */

import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../types';

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSpeakerLabel = (speaker: TranscriptEntry['speaker']): string => {
    switch (speaker) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'AI';
      case 'participant':
        return 'Speaker';
      default:
        return 'Unknown';
    }
  };

  const getSpeakerColor = (speaker: TranscriptEntry['speaker']): string => {
    switch (speaker) {
      case 'user':
        return '#3b82f6'; // Blue
      case 'assistant':
        return '#8b5cf6'; // Purple
      case 'participant':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Transcript</h2>
        <span style={styles.count}>{transcript.length} entries</span>
      </div>

      <div ref={scrollRef} style={styles.transcriptList}>
        {transcript.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Transcript will appear here as you speak...</p>
          </div>
        ) : (
          transcript.map((entry) => (
            <div key={entry.id} style={styles.entry}>
              <div style={styles.entryHeader}>
                <span
                  style={{
                    ...styles.speaker,
                    color: getSpeakerColor(entry.speaker)
                  }}
                >
                  {getSpeakerLabel(entry.speaker)}
                </span>
                <span style={styles.timestamp}>{formatTime(entry.timestamp)}</span>
              </div>
              <p style={styles.content}>{entry.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff'
  },
  header: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827'
  },
  count: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  transcriptList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    backgroundColor: '#f9fafb'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '0.875rem',
    textAlign: 'center'
  },
  entry: {
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb'
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  speaker: {
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontFamily: 'monospace'
  },
  content: {
    margin: 0,
    fontSize: '0.875rem',
    lineHeight: '1.5',
    color: '#374151',
    whiteSpace: 'pre-wrap'
  }
};
