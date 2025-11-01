/**
 * Session Manager Service
 * Handles communication with backend to generate ephemeral tokens
 */

import type { SessionToken } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Request an ephemeral token from the backend
   */
  async createSession(): Promise<SessionToken> {
    try {
      const response = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to create session: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.ephemeralToken) {
        throw new Error('Invalid response from server: missing ephemeral token');
      }

      console.log('Ephemeral token created successfully');
      return {
        ephemeralToken: data.ephemeralToken,
        expiresAt: data.expiresAt,
        sessionId: data.sessionId
      };
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to connect to backend. Please ensure the backend server is running.'
      );
    }
  }

  /**
   * Validate backend connection
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

export const sessionManager = SessionManager.getInstance();
