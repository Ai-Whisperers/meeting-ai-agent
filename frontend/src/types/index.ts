/**
 * Type definitions for the Meetings Agent application
 */

// Desktop mode: B2B Strategic insights
export type DesktopInsightType = 'opportunity' | 'caution' | 'risk' | 'next-step';

// Mobile mode: Operational insights
export type MobileInsightType = 'technique' | 'advice' | 'action-item' | 'key-insight';

// Combined type for all insight types
export type InsightType = DesktopInsightType | MobileInsightType;

export interface Insight {
  id: string;
  type: InsightType;
  content: string;
  timestamp: number;
  context?: string; // Related transcript excerpt
}

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant' | 'participant';
  content: string;
  timestamp: number;
}

export interface MeetingSession {
  id: string;
  title?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: 'active' | 'completed' | 'archived';
  transcript: TranscriptEntry[];
  insights: Insight[];
  participants?: string[];
  notes?: string;
}

// Alias for backend compatibility
export type Meeting = MeetingSession;

export interface SessionToken {
  ephemeralToken: string;
  expiresAt: string;
  sessionId?: string;
}

export interface AudioStreamConfig {
  systemAudio: MediaStream | null;
  microphone: MediaStream | null;
  merged: MediaStream | null;
}

export type MeetingStatus = 'idle' | 'starting' | 'active' | 'paused' | 'ending' | 'ended';

export interface AppState {
  status: MeetingStatus;
  currentSession: MeetingSession | null;
  error: string | null;
  isConnected: boolean;
}
