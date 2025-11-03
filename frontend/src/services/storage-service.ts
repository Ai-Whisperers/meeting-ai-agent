/**
 * Storage Service
 * Handles localStorage operations for meeting sessions
 * Now integrates with sync service for automatic SQLite persistence
 */

import type { MeetingSession } from '../types';
import { getSyncService } from './sync-service';

const STORAGE_KEY = 'meetings_agent_sessions';
const MAX_SESSIONS = 50; // Limit stored sessions to prevent localStorage overflow
const STORAGE_KEY_PREFIX = 'meetings-agent';

export class StorageService {
  private static instance: StorageService;
  private syncService = getSyncService();

  private constructor() {
    // Start auto-sync on initialization
    this.syncService.startAutoSync();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Get all stored meeting sessions
   */
  getAllSessions(): MeetingSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const sessions = JSON.parse(data) as MeetingSession[];
      return sessions.sort((a, b) => b.startTime - a.startTime); // Most recent first
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a specific session by ID
   */
  getSession(id: string): MeetingSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(session => session.id === id) || null;
  }

  /**
   * Save a new session or update existing one
   */
  saveSession(session: MeetingSession): void {
    try {
      let sessions = this.getAllSessions();

      // Check if session already exists
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = session;
      } else {
        // Add new session
        sessions.unshift(session);

        // Limit number of stored sessions
        if (sessions.length > MAX_SESSIONS) {
          sessions = sessions.slice(0, MAX_SESSIONS);
          console.warn(`Trimmed sessions to ${MAX_SESSIONS} most recent`);
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

      // Also save in detailed format for sync service
      this.saveSessionDetailed(session);

      console.log('Session saved to localStorage:', session.id);

      // Mark for sync
      this.syncService.markPendingSync();
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
      // Try to free up space if quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearOldSessions(10);
        this.saveSession(session); // Retry
      }
    }
  }

  /**
   * Save session in detailed format for sync service
   */
  private saveSessionDetailed(session: MeetingSession): void {
    try {
      // Save meeting metadata
      const meetingKey = `${STORAGE_KEY_PREFIX}-meeting-${session.id}`;
      localStorage.setItem(meetingKey, JSON.stringify({
        id: session.id,
        title: session.title || 'Untitled Meeting',
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        status: session.status || 'completed'
      }));

      // Save transcripts separately
      const transcriptsKey = `${STORAGE_KEY_PREFIX}-transcripts-${session.id}`;
      localStorage.setItem(transcriptsKey, JSON.stringify(session.transcript));

      // Save insights separately
      const insightsKey = `${STORAGE_KEY_PREFIX}-insights-${session.id}`;
      localStorage.setItem(insightsKey, JSON.stringify(session.insights));
    } catch (error) {
      console.error('Failed to save detailed session data:', error);
    }
  }

  /**
   * Delete a session by ID
   */
  deleteSession(id: string): void {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(session => session.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      // Delete detailed session data
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}-meeting-${id}`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}-transcripts-${id}`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}-insights-${id}`);

      console.log('Session deleted:', id);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  /**
   * Clear old sessions to free up space
   */
  private clearOldSessions(keepCount: number): void {
    try {
      const sessions = this.getAllSessions();
      const toKeep = sessions.slice(0, keepCount);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toKeep));
      console.log(`Cleared old sessions, keeping ${keepCount} most recent`);
    } catch (error) {
      console.error('Failed to clear old sessions:', error);
    }
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    try {
      // Get all sessions first to clean up detailed data
      const sessions = this.getAllSessions();
      sessions.forEach(session => {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}-meeting-${session.id}`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}-transcripts-${session.id}`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}-insights-${session.id}`);
      });

      localStorage.removeItem(STORAGE_KEY);
      console.log('All sessions cleared');
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  }

  /**
   * Manually trigger sync to backend
   */
  async syncToBackend(): Promise<boolean> {
    return this.syncService.syncNow();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return this.syncService.getStatus();
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: any) => void): () => void {
    return this.syncService.onStatusChange(callback);
  }

  /**
   * Export sessions as JSON
   */
  exportSessions(): string {
    const sessions = this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  /**
   * Export a single session as Markdown
   */
  exportSessionAsMarkdown(session: MeetingSession): string {
    const date = new Date(session.startTime).toLocaleString();
    const duration = session.duration
      ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`
      : 'N/A';

    let markdown = `# Meeting: ${session.title || 'Untitled'}\n\n`;
    markdown += `**Date:** ${date}\n`;
    markdown += `**Duration:** ${duration}\n\n`;

    if (session.participants && session.participants.length > 0) {
      markdown += `**Participants:** ${session.participants.join(', ')}\n\n`;
    }

    markdown += `## Transcript\n\n`;
    session.transcript.forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      markdown += `**[${time}] ${entry.speaker}:** ${entry.content}\n\n`;
    });

    markdown += `## Insights\n\n`;

    const insights = {
      opportunity: session.insights.filter(i => i.type === 'opportunity'),
      caution: session.insights.filter(i => i.type === 'caution'),
      risk: session.insights.filter(i => i.type === 'risk'),
      'next-step': session.insights.filter(i => i.type === 'next-step')
    };

    if (insights.opportunity.length > 0) {
      markdown += `### 🟢 Opportunities\n\n`;
      insights.opportunity.forEach(insight => {
        markdown += `- ${insight.content}\n`;
      });
      markdown += `\n`;
    }

    if (insights.caution.length > 0) {
      markdown += `### 🟡 Cautions\n\n`;
      insights.caution.forEach(insight => {
        markdown += `- ${insight.content}\n`;
      });
      markdown += `\n`;
    }

    if (insights.risk.length > 0) {
      markdown += `### 🔴 Risks\n\n`;
      insights.risk.forEach(insight => {
        markdown += `- ${insight.content}\n`;
      });
      markdown += `\n`;
    }

    if (insights['next-step'].length > 0) {
      markdown += `### 🔵 Next Steps\n\n`;
      insights['next-step'].forEach(insight => {
        markdown += `- ${insight.content}\n`;
      });
      markdown += `\n`;
    }

    if (session.notes) {
      markdown += `## Notes\n\n${session.notes}\n`;
    }

    return markdown;
  }
}

export const storageService = StorageService.getInstance();
