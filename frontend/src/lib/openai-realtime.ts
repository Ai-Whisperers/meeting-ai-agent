/**
 * Custom OpenAI Realtime API WebRTC Client
 * Based on OpenAI Realtime API documentation
 */

export interface RealtimeClientConfig {
  apiKey: string;
  dangerouslyAllowAPIKeyInBrowser?: boolean;
}

export interface SessionConfig {
  instructions?: string;
  voice?: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
}

export class RealtimeClient {
  private apiKey: string;
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private isConnecting: boolean = false;

  constructor(config: RealtimeClientConfig) {
    this.apiKey = config.apiKey;
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  async updateSession(config: SessionConfig): Promise<void> {
    // Store session config to send after connection
    this.sessionConfig = config;
  }

  private sessionConfig: SessionConfig | null = null;

  async connect(): Promise<void> {
    if (this.ws || this.isConnecting) {
      console.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    try {
      // Connect via WebSocket using ephemeral token
      const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;

      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${this.apiKey}`,
        'openai-beta.realtime-v1'
      ]);

      this.ws.onopen = () => {
        console.log('WebSocket connected to OpenAI Realtime API');
        this.isConnecting = false;

        // Send session update if configured
        if (this.sessionConfig) {
          this.send('session.update', { session: this.sessionConfig });
        }

        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerEvent(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { error: { message: 'WebSocket error' } });
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;
        this.emit('disconnected');
      };

    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private handleServerEvent(message: any): void {
    const { type } = message;

    switch (type) {
      case 'session.created':
      case 'session.updated':
        console.log('Session ready:', message);
        break;

      case 'conversation.item.created':
      case 'conversation.item.input_audio_transcription.completed':
      case 'conversation.item.input_audio_transcription.failed':
      case 'response.created':
      case 'response.done':
      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'response.text.delta':
      case 'response.text.done':
      case 'response.audio_transcript.delta':
      case 'response.audio_transcript.done':
      case 'response.audio.delta':
      case 'response.audio.done':
        // Emit specific events
        this.emit(type, message);

        // Also emit as conversation.updated for compatibility
        this.emit('conversation.updated', {
          item: message.item,
          delta: message.delta,
          ...message
        });
        break;

      case 'input_audio_buffer.speech_started':
      case 'input_audio_buffer.speech_stopped':
      case 'input_audio_buffer.committed':
        this.emit(type, message);
        break;

      case 'error':
        console.error('Server error:', message);
        this.emit('error', message);
        break;

      default:
        console.log('Unhandled event type:', type, message);
    }
  }

  private send(type: string, data?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not open');
      return;
    }

    const message = {
      type,
      ...data
    };

    this.ws.send(JSON.stringify(message));
  }

  sendUserMessageContent(content: any[]): void {
    this.send('conversation.item.create', {
      item: {
        type: 'message',
        role: 'user',
        content
      }
    });

    // Trigger response generation
    this.send('response.create');
  }

  sendAudio(audioData: Int16Array): void {
    // Convert Int16Array to base64
    const base64Audio = this.arrayBufferToBase64(audioData.buffer);

    this.send('input_audio_buffer.append', {
      audio: base64Audio
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
