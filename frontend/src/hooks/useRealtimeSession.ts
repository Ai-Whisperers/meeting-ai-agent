/**
 * React Hook for managing Realtime API sessions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RealtimeClientWrapper } from '../services/realtime-client';
import { sessionManager } from '../services/session-manager';
import { captureAndMergeAudio, stopAudioCapture, type AudioCaptureResult } from '../services/audio-capture';
import { storageService } from '../services/storage-service';
import type { MeetingSession, TranscriptEntry, Insight, MeetingStatus } from '../types';

export interface UseRealtimeSessionResult {
  // State
  status: MeetingStatus;
  transcript: TranscriptEntry[];
  insights: Insight[];
  error: string | null;
  isConnected: boolean;
  currentSession: MeetingSession | null;

  // Actions
  startMeeting: () => Promise<void>;
  endMeeting: () => void;
  pauseMeeting: () => void;
  resumeMeeting: () => void;
}

export function useRealtimeSession(): UseRealtimeSessionResult {
  const [status, setStatus] = useState<MeetingStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<MeetingSession | null>(null);

  const realtimeClientRef = useRef<RealtimeClientWrapper | null>(null);
  const audioRef = useRef<AudioCaptureResult | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
      }
      if (audioRef.current) {
        stopAudioCapture(audioRef.current);
      }
    };
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry]);
  }, []);

  const handleInsight = useCallback((insight: Insight) => {
    setInsights(prev => [...prev, insight]);
  }, []);

  const handleError = useCallback((err: Error) => {
    console.error('Realtime session error:', err);
    setError(err.message);
    setStatus('ended');
  }, []);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    setStatus('active');
    setError(null);
  }, []);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, []);

  const startMeeting = useCallback(async () => {
    try {
      setStatus('starting');
      setError(null);
      setTranscript([]);
      setInsights([]);

      // Step 1: Capture audio
      console.log('Capturing audio...');
      const audioCaptureResult = await captureAndMergeAudio();
      audioRef.current = audioCaptureResult;

      if (!audioCaptureResult.mergedStream) {
        throw new Error('Failed to create merged audio stream');
      }

      // Step 2: Get ephemeral token from backend
      console.log('Requesting ephemeral token...');
      const { ephemeralToken, sessionId } = await sessionManager.createSession();
      sessionIdRef.current = sessionId || `session-${Date.now()}`;

      // Step 3: Initialize Realtime client
      console.log('Initializing Realtime client...');
      const client = new RealtimeClientWrapper(
        {
          ephemeralToken,
          audioStream: audioCaptureResult.mergedStream
        },
        {
          onTranscript: handleTranscript,
          onInsight: handleInsight,
          onError: handleError,
          onConnected: handleConnected,
          onDisconnected: handleDisconnected
        }
      );

      realtimeClientRef.current = client;

      // Step 4: Connect to OpenAI
      console.log('Connecting to OpenAI Realtime API...');
      await client.connect(audioCaptureResult.mergedStream);

      // Create session object
      const newSession: MeetingSession = {
        id: sessionIdRef.current,
        startTime: Date.now(),
        transcript: [],
        insights: []
      };

      setCurrentSession(newSession);

      console.log('Meeting started successfully!');
    } catch (err) {
      console.error('Failed to start meeting:', err);
      setError(err instanceof Error ? err.message : 'Failed to start meeting');
      setStatus('idle');

      // Cleanup on error
      if (audioRef.current) {
        stopAudioCapture(audioRef.current);
        audioRef.current = null;
      }
    }
  }, [handleTranscript, handleInsight, handleError, handleConnected, handleDisconnected]);

  const endMeeting = useCallback(() => {
    setStatus('ending');

    // Save session to localStorage
    if (currentSession && sessionIdRef.current) {
      const finalSession: MeetingSession = {
        ...currentSession,
        id: sessionIdRef.current,
        endTime: Date.now(),
        duration: Math.floor((Date.now() - currentSession.startTime) / 1000),
        transcript,
        insights
      };

      storageService.saveSession(finalSession);
      console.log('Session saved:', finalSession.id);
    }

    // Disconnect Realtime client
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }

    // Stop audio capture
    if (audioRef.current) {
      stopAudioCapture(audioRef.current);
      audioRef.current = null;
    }

    setStatus('ended');
    setIsConnected(false);
    setCurrentSession(null);

    console.log('Meeting ended');
  }, [currentSession, transcript, insights]);

  const pauseMeeting = useCallback(() => {
    // TODO: Implement pause functionality
    setStatus('paused');
    console.log('Meeting paused');
  }, []);

  const resumeMeeting = useCallback(() => {
    // TODO: Implement resume functionality
    setStatus('active');
    console.log('Meeting resumed');
  }, []);

  return {
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
  };
}
