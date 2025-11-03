-- Meetings Agent SQLite Schema
-- This schema stores meeting sessions, transcripts, and insights

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration INTEGER,
    status TEXT CHECK(status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    metadata TEXT, -- JSON string for additional metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    speaker TEXT NOT NULL CHECK(speaker IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Insights table
-- Supports both desktop mode (B2B strategic) and mobile mode (operational) insights
CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
        'opportunity', 'caution', 'risk', 'next-step',           -- Desktop mode: B2B Strategic
        'technique', 'advice', 'action-item', 'key-insight'      -- Mobile mode: Operational
    )),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(timestamp);
CREATE INDEX IF NOT EXISTS idx_insights_meeting_id ON insights(meeting_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_is_read ON insights(is_read);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_meetings_timestamp
    AFTER UPDATE ON meetings
    FOR EACH ROW
BEGIN
    UPDATE meetings SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

-- View for meeting statistics
CREATE VIEW IF NOT EXISTS meeting_stats AS
SELECT
    m.id,
    m.title,
    m.start_time,
    m.duration,
    COUNT(DISTINCT t.id) as transcript_count,
    COUNT(DISTINCT i.id) as insight_count,
    -- Desktop mode (B2B Strategic) insights
    SUM(CASE WHEN i.type = 'opportunity' THEN 1 ELSE 0 END) as opportunities,
    SUM(CASE WHEN i.type = 'caution' THEN 1 ELSE 0 END) as cautions,
    SUM(CASE WHEN i.type = 'risk' THEN 1 ELSE 0 END) as risks,
    SUM(CASE WHEN i.type = 'next-step' THEN 1 ELSE 0 END) as next_steps,
    -- Mobile mode (Operational) insights
    SUM(CASE WHEN i.type = 'technique' THEN 1 ELSE 0 END) as techniques,
    SUM(CASE WHEN i.type = 'advice' THEN 1 ELSE 0 END) as advice_items,
    SUM(CASE WHEN i.type = 'action-item' THEN 1 ELSE 0 END) as action_items,
    SUM(CASE WHEN i.type = 'key-insight' THEN 1 ELSE 0 END) as key_insights
FROM meetings m
LEFT JOIN transcripts t ON m.id = t.meeting_id
LEFT JOIN insights i ON m.id = i.meeting_id
GROUP BY m.id;
