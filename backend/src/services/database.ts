import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Meeting {
  id: string;
  title: string;
  start_time: number;
  end_time?: number;
  duration?: number;
  status: 'active' | 'completed' | 'archived';
  metadata?: string;
  created_at?: number;
  updated_at?: number;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  speaker: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  created_at?: number;
}

export interface Insight {
  id: string;
  meeting_id: string;
  type: 'opportunity' | 'caution' | 'risk' | 'next-step';
  content: string;
  timestamp: number;
  is_read: boolean;
  created_at?: number;
}

class DatabaseService {
  private db: Database.Database;

  constructor() {
    // Ensure db directory exists
    const dbDir = path.join(__dirname, '..', '..', '..', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    const dbPath = path.join(dbDir, 'meetings.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');

    // Initialize schema
    this.initSchema();

    console.log('✅ Database initialized:', dbPath);
  }

  private initSchema(): void {
    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', '..', '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    this.db.exec(schema);
  }

  // ===== MEETINGS =====

  createMeeting(meeting: Meeting): Meeting {
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, title, start_time, end_time, duration, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      meeting.id,
      meeting.title,
      meeting.start_time,
      meeting.end_time || null,
      meeting.duration || null,
      meeting.status || 'active',
      meeting.metadata || null
    );

    return this.getMeeting(meeting.id)!;
  }

  getMeeting(id: string): Meeting | undefined {
    const stmt = this.db.prepare('SELECT * FROM meetings WHERE id = ?');
    return stmt.get(id) as Meeting | undefined;
  }

  getAllMeetings(limit = 100, offset = 0): Meeting[] {
    const stmt = this.db.prepare(`
      SELECT * FROM meetings
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Meeting[];
  }

  updateMeeting(id: string, updates: Partial<Meeting>): Meeting | undefined {
    const fields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return this.getMeeting(id);

    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([_, value]) => value);

    const stmt = this.db.prepare(`UPDATE meetings SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);

    return this.getMeeting(id);
  }

  deleteMeeting(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM meetings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ===== TRANSCRIPTS =====

  createTranscript(transcript: Transcript): Transcript {
    const stmt = this.db.prepare(`
      INSERT INTO transcripts (id, meeting_id, speaker, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      transcript.id,
      transcript.meeting_id,
      transcript.speaker,
      transcript.content,
      transcript.timestamp
    );

    return this.getTranscript(transcript.id)!;
  }

  createTranscriptBatch(transcripts: Transcript[]): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO transcripts (id, meeting_id, speaker, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insert = this.db.transaction((items: Transcript[]) => {
      for (const item of items) {
        stmt.run(item.id, item.meeting_id, item.speaker, item.content, item.timestamp);
      }
    });

    insert(transcripts);
    return transcripts.length;
  }

  getTranscript(id: string): Transcript | undefined {
    const stmt = this.db.prepare('SELECT * FROM transcripts WHERE id = ?');
    return stmt.get(id) as Transcript | undefined;
  }

  getTranscriptsByMeeting(meetingId: string): Transcript[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transcripts
      WHERE meeting_id = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(meetingId) as Transcript[];
  }

  // ===== INSIGHTS =====

  createInsight(insight: Insight): Insight {
    const stmt = this.db.prepare(`
      INSERT INTO insights (id, meeting_id, type, content, timestamp, is_read)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      insight.id,
      insight.meeting_id,
      insight.type,
      insight.content,
      insight.timestamp,
      insight.is_read ? 1 : 0
    );

    return this.getInsight(insight.id)!;
  }

  createInsightBatch(insights: Insight[]): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO insights (id, meeting_id, type, content, timestamp, is_read)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insert = this.db.transaction((items: Insight[]) => {
      for (const item of items) {
        stmt.run(
          item.id,
          item.meeting_id,
          item.type,
          item.content,
          item.timestamp,
          item.is_read ? 1 : 0
        );
      }
    });

    insert(insights);
    return insights.length;
  }

  getInsight(id: string): Insight | undefined {
    const stmt = this.db.prepare('SELECT * FROM insights WHERE id = ?');
    return stmt.get(id) as Insight | undefined;
  }

  getInsightsByMeeting(meetingId: string): Insight[] {
    const stmt = this.db.prepare(`
      SELECT * FROM insights
      WHERE meeting_id = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(meetingId) as Insight[];
  }

  markInsightAsRead(id: string): boolean {
    const stmt = this.db.prepare('UPDATE insights SET is_read = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ===== SYNC OPERATIONS =====

  syncMeetingData(data: {
    meeting: Meeting;
    transcripts: Transcript[];
    insights: Insight[];
  }): {
    meeting: Meeting;
    transcriptsCount: number;
    insightsCount: number;
  } {
    // Use transaction for atomicity
    const sync = this.db.transaction(() => {
      // Upsert meeting
      const existingMeeting = this.getMeeting(data.meeting.id);
      let meeting: Meeting;

      if (existingMeeting) {
        meeting = this.updateMeeting(data.meeting.id, data.meeting)!;
      } else {
        meeting = this.createMeeting(data.meeting);
      }

      // Batch insert transcripts
      const transcriptsCount = data.transcripts.length > 0
        ? this.createTranscriptBatch(data.transcripts)
        : 0;

      // Batch insert insights
      const insightsCount = data.insights.length > 0
        ? this.createInsightBatch(data.insights)
        : 0;

      return { meeting, transcriptsCount, insightsCount };
    });

    return sync();
  }

  // ===== STATISTICS =====

  getMeetingStats(meetingId: string) {
    const stmt = this.db.prepare('SELECT * FROM meeting_stats WHERE id = ?');
    return stmt.get(meetingId);
  }

  // ===== CLEANUP =====

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

export default DatabaseService;
