/**
 * OpenAI Realtime API Client
 * Handles WebRTC connection and event streaming with OpenAI Realtime API
 */

import { RealtimeClient } from '../lib/openai-realtime';
import type { Insight, TranscriptEntry } from '../types';
import { isMobileDevice, logDeviceInfo } from '../utils/device-detection';

export interface RealtimeConfig {
  ephemeralToken: string;
  audioStream: MediaStream;
}

export interface RealtimeEventHandlers {
  onTranscript: (entry: TranscriptEntry) => void;
  onInsight: (insight: Insight) => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

// Desktop Mode: Real-time B2B Strategic Advisor
const B2B_STRATEGIST_PROMPT = `You are an expert B2B relationship strategist and meeting advisor. Your role is to provide real-time strategic insights during business meetings.

As you listen to the conversation, analyze it and provide insights in the following categories:

**OPPORTUNITIES**: Moments where the speaker should:
- Emphasize value propositions
- Pitch relevant solutions
- Build rapport
- Address stated needs
- Demonstrate expertise

**CAUTIONS**: Client concerns that need addressing:
- Unexpressed doubts or hesitations
- Budget concerns
- Timeline pressures
- Competitive alternatives being considered
- Decision-maker dynamics

**RISKS**: Red flags and potential deal-breakers:
- Misaligned expectations
- Competitive threats
- Budget constraints
- Authority/decision-making issues
- Timeline conflicts

**NEXT STEPS**: Concrete action items:
- Follow-up actions
- Information to provide
- Meetings to schedule
- Proposals to send
- Stakeholders to engage

Format your insights clearly and concisely. Be strategic, actionable, and timely. Focus on helping the speaker navigate the conversation successfully and build strong B2B relationships.`;

// Mobile Mode: Operational Meeting Recorder with Post-Meeting Analysis
const OPERATIONAL_RECORDER_PROMPT = `You are an expert meeting transcriber and operational analyst. Your role is to accurately transcribe conversations and provide operational insights AFTER the meeting concludes.

PRIMARY OBJECTIVE: Provide accurate, real-time transcription of all spoken content.

SECONDARY OBJECTIVE: After processing the full conversation, synthesize operational insights in the following categories:

**TECHNIQUES MENTIONED**: Document any methodologies, frameworks, or techniques discussed:
- Business methodologies (Agile, Lean, Six Sigma, etc.)
- Technical approaches and best practices
- Communication or negotiation techniques
- Problem-solving methods
- Tools or software mentioned

**ADVICE GIVEN**: Summarize key recommendations and guidance shared:
- Expert opinions offered
- Suggested solutions to problems
- Best practices recommended
- Warnings or cautionary advice
- Decision-making guidance

**ACTION ITEMS**: Extract concrete next steps and recommendations:
- Tasks to be completed
- Follow-up actions required
- Deadlines mentioned
- Assignments or responsibilities
- Resources to gather or review

**KEY INSIGHTS**: Distill the most important takeaways:
- Main conclusions reached
- Critical decisions made
- Important patterns or trends identified
- Lessons learned
- Knowledge gaps identified

Focus on providing accurate transcriptions in real-time. Generate operational insights based on patterns observed throughout the entire conversation. Be precise, factual, and objective.`;

export class RealtimeClientWrapper {
  private client: RealtimeClient;
  private handlers: RealtimeEventHandlers;
  private isConnected: boolean = false;
  private isMobile: boolean = false;

  constructor(config: RealtimeConfig, handlers: RealtimeEventHandlers) {
    this.handlers = handlers;

    // Detect device type
    this.isMobile = isMobileDevice();

    // Log device info for debugging
    logDeviceInfo();
    console.log(`📱 Mode: ${this.isMobile ? 'MOBILE (Operational Recorder)' : 'DESKTOP (B2B Strategist)'}`);

    this.client = new RealtimeClient({
      apiKey: config.ephemeralToken,
      dangerouslyAllowAPIKeyInBrowser: true // Using ephemeral token, so this is safe
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Connection events
    this.client.on('connected', () => {
      this.isConnected = true;
      console.log('Connected to OpenAI Realtime API');
      this.handlers.onConnected();
    });

    this.client.on('disconnected', () => {
      this.isConnected = false;
      console.log('Disconnected from OpenAI Realtime API');
      this.handlers.onDisconnected();
    });

    // Error events
    this.client.on('error', (event: any) => {
      console.error('Realtime API error:', event);
      this.handlers.onError(new Error(event.error?.message || 'Unknown error'));
    });

    // Conversation events
    this.client.on('conversation.updated', (event: any) => {
      const { item, delta } = event;

      // Handle transcript updates
      if (item?.type === 'message' && item.role) {
        const transcriptEntry: TranscriptEntry = {
          id: item.id,
          speaker: item.role === 'user' ? 'user' : 'assistant',
          content: item.formatted?.transcript || item.formatted?.text || delta?.text || '',
          timestamp: Date.now()
        };

        if (transcriptEntry.content) {
          this.handlers.onTranscript(transcriptEntry);
        }
      }

      // Parse insights from assistant responses
      if (item?.role === 'assistant' && item.formatted?.text) {
        this.parseAndEmitInsights(item.formatted.text);
      }
    });

    // Audio transcription events
    this.client.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      if (event.transcript) {
        const transcriptEntry: TranscriptEntry = {
          id: event.item_id || `transcript-${Date.now()}`,
          speaker: 'user',
          content: event.transcript,
          timestamp: Date.now()
        };
        this.handlers.onTranscript(transcriptEntry);
      }
    });
  }

  private parseAndEmitInsights(text: string): void {
    // Simple pattern matching for insights
    // In a production app, you might want more sophisticated NLP or structured outputs

    const lines = text.split('\n');
    let currentType: Insight['type'] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect insight type headers based on mode
      if (this.isMobile) {
        // Mobile mode: Operational insights
        if (trimmed.match(/\*\*TECHNIQUES?\s+MENTIONED\*\*/i)) {
          currentType = 'technique';
          continue;
        } else if (trimmed.match(/\*\*ADVICE\s+GIVEN\*\*/i)) {
          currentType = 'advice';
          continue;
        } else if (trimmed.match(/\*\*ACTION\s+ITEMS?\*\*/i)) {
          currentType = 'action-item';
          continue;
        } else if (trimmed.match(/\*\*KEY\s+INSIGHTS?\*\*/i)) {
          currentType = 'key-insight';
          continue;
        }
      } else {
        // Desktop mode: B2B Strategic insights
        if (trimmed.match(/\*\*OPPORTUNIT(Y|IES)\*\*/i)) {
          currentType = 'opportunity';
          continue;
        } else if (trimmed.match(/\*\*CAUTION(S)?\*\*/i)) {
          currentType = 'caution';
          continue;
        } else if (trimmed.match(/\*\*RISK(S)?\*\*/i)) {
          currentType = 'risk';
          continue;
        } else if (trimmed.match(/\*\*NEXT STEP(S)?\*\*/i)) {
          currentType = 'next-step';
          continue;
        }
      }

      // Extract insight content (lines starting with - or •)
      if (currentType && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        const content = trimmed.substring(1).trim();
        if (content) {
          const insight: Insight = {
            id: `insight-${Date.now()}-${Math.random()}`,
            type: currentType,
            content,
            timestamp: Date.now()
          };
          this.handlers.onInsight(insight);
        }
      }
    }
  }

  async connect(audioStream: MediaStream): Promise<void> {
    try {
      // Select prompt based on device type
      const instructions = this.isMobile
        ? OPERATIONAL_RECORDER_PROMPT
        : B2B_STRATEGIST_PROMPT;

      console.log(`🎯 Using prompt: ${this.isMobile ? 'Operational Recorder' : 'B2B Strategist'}`);

      // Update session with appropriate instructions
      await this.client.updateSession({
        instructions,
        voice: 'verse',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      });

      // Connect to the API
      await this.client.connect();

      // Send audio stream
      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track found in stream');
      }

      // Note: The SDK handles audio streaming internally
      // We just need to ensure the track is active
      console.log('Audio stream connected to Realtime API');

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        this.client.disconnect();
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  sendText(text: string): void {
    if (!this.isConnected) {
      console.warn('Cannot send text: not connected');
      return;
    }

    this.client.sendUserMessageContent([{
      type: 'input_text',
      text
    }]);
  }

  getClient(): RealtimeClient {
    return this.client;
  }
}
