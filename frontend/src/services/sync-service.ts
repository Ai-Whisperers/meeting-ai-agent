/**
 * Sync Service
 * Automatically synchronizes localStorage data to SQLite backend
 */

import type { Meeting, TranscriptEntry, Insight } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SYNC_INTERVAL = 30000; // Sync every 30 seconds
const SYNC_KEY_PREFIX = 'meetings-agent';

export interface SyncStatus {
  lastSync: number | null;
  isSyncing: boolean;
  error: string | null;
  pendingSync: boolean;
}

class SyncService {
  private syncInterval: number | null = null;
  private status: SyncStatus = {
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingSync: false
  };
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Start automatic syncing
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      console.log('Auto-sync already running');
      return;
    }

    console.log('🔄 Starting auto-sync service...');

    // Initial sync
    this.syncNow();

    // Set up interval
    this.syncInterval = window.setInterval(() => {
      this.syncNow();
    }, SYNC_INTERVAL);
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  /**
   * Manually trigger sync
   */
  async syncNow(): Promise<boolean> {
    if (this.status.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return false;
    }

    this.updateStatus({ isSyncing: true, error: null });

    try {
      // Get all meetings from localStorage
      const meetings = this.getMeetingsFromLocalStorage();

      if (meetings.length === 0) {
        console.log('No meetings to sync');
        this.updateStatus({
          isSyncing: false,
          lastSync: Date.now(),
          pendingSync: false
        });
        return true;
      }

      console.log(`Syncing ${meetings.length} meeting(s) to database...`);

      // Sync each meeting
      let syncCount = 0;
      for (const meetingData of meetings) {
        try {
          await this.syncMeetingToBackend(meetingData);
          syncCount++;
        } catch (error) {
          console.error('Error syncing meeting:', meetingData.meeting.id, error);
        }
      }

      console.log(`✅ Successfully synced ${syncCount}/${meetings.length} meeting(s)`);

      this.updateStatus({
        isSyncing: false,
        lastSync: Date.now(),
        error: null,
        pendingSync: false
      });

      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('Sync failed:', errorMsg);

      this.updateStatus({
        isSyncing: false,
        error: errorMsg,
        pendingSync: true
      });

      return false;
    }
  }

  /**
   * Get meetings from localStorage
   */
  private getMeetingsFromLocalStorage(): Array<{
    meeting: Meeting;
    transcripts: TranscriptEntry[];
    insights: Insight[];
  }> {
    const meetings: Array<{
      meeting: Meeting;
      transcripts: TranscriptEntry[];
      insights: Insight[];
    }> = [];

    // Iterate through localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(`${SYNC_KEY_PREFIX}-meeting-`)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const meetingData = JSON.parse(data);

            // Extract meeting ID from key
            const meetingId = key.replace(`${SYNC_KEY_PREFIX}-meeting-`, '');

            // Get transcripts
            const transcriptsKey = `${SYNC_KEY_PREFIX}-transcripts-${meetingId}`;
            const transcriptsData = localStorage.getItem(transcriptsKey);
            const transcripts = transcriptsData ? JSON.parse(transcriptsData) : [];

            // Get insights
            const insightsKey = `${SYNC_KEY_PREFIX}-insights-${meetingId}`;
            const insightsData = localStorage.getItem(insightsKey);
            const insights = insightsData ? JSON.parse(insightsData) : [];

            meetings.push({
              meeting: meetingData,
              transcripts,
              insights
            });
          }
        } catch (error) {
          console.error('Error parsing meeting data from localStorage:', key, error);
        }
      }
    }

    return meetings;
  }

  /**
   * Sync a single meeting to backend
   */
  private async syncMeetingToBackend(data: {
    meeting: Meeting;
    transcripts: TranscriptEntry[];
    insights: Insight[];
  }): Promise<void> {
    const response = await fetch(`${API_URL}/api/data/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meeting: {
          id: data.meeting.id,
          title: data.meeting.title || 'Untitled Meeting',
          start_time: data.meeting.startTime,
          end_time: data.meeting.endTime,
          duration: data.meeting.duration,
          status: data.meeting.status || 'completed',
          metadata: JSON.stringify({
            insights_count: data.insights.length,
            transcripts_count: data.transcripts.length
          })
        },
        transcripts: data.transcripts.map(t => ({
          id: t.id,
          meeting_id: data.meeting.id,
          speaker: t.speaker,
          content: t.content,
          timestamp: t.timestamp
        })),
        insights: data.insights.map(i => ({
          id: i.id,
          meeting_id: data.meeting.id,
          type: i.type,
          content: i.content,
          timestamp: i.timestamp,
          is_read: false
        }))
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sync meeting');
    }
  }

  /**
   * Load meeting from backend
   */
  async loadMeetingFromBackend(meetingId: string): Promise<{
    meeting: any;
    transcripts: any[];
    insights: any[];
  } | null> {
    try {
      const response = await fetch(`${API_URL}/api/data/meetings/${meetingId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to load meeting from backend');
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Error loading meeting from backend:', error);
      return null;
    }
  }

  /**
   * Get all meetings from backend
   */
  async getAllMeetingsFromBackend(limit = 100, offset = 0): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_URL}/api/data/meetings?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error('Failed to load meetings from backend');
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Error loading meetings from backend:', error);
      return [];
    }
  }

  /**
   * Mark data as pending sync (when localStorage is updated)
   */
  markPendingSync(): void {
    this.updateStatus({ pendingSync: true });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };

    // Notify all listeners
    this.listeners.forEach(listener => {
      listener(this.status);
    });
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

export default SyncService;
