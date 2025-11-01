/**
 * Storage Service
 * Handles localStorage operations for meeting sessions
 */

import type { MeetingSession } from '../types';

const STORAGE_KEY = 'meetings_agent_sessions';
const MAX_SESSIONS = 50; // Limit stored sessions to prevent localStorage overflow

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

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
      console.log('Session saved to localStorage:', session.id);
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
   * Delete a session by ID
   */
  deleteSession(id: string): void {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(session => session.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
      localStorage.removeItem(STORAGE_KEY);
      console.log('All sessions cleared');
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
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
