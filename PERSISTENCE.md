# Data Persistence Architecture

This document explains the two-layer data persistence system in the Meetings Agent application.

## Overview

The application uses a **dual-layer persistence architecture**:

1. **localStorage** (Frontend) - Fast, immediate storage in the browser
2. **SQLite Database** (Backend) - Durable, server-side persistence

Data flows from localStorage → SQLite automatically via a sync service.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│                                                               │
│  ┌─────────────┐      ┌─────────────┐      ┌──────────────┐ │
│  │ Components  │ ───> │ Storage     │ ───> │ Sync Service │ │
│  │             │      │ Service     │      │              │ │
│  │ (React)     │ <─── │ (localStorage)    │ (Auto-sync)   │ │
│  └─────────────┘      └─────────────┘      └──────┬───────┘ │
│                                                     │         │
└─────────────────────────────────────────────────────┼─────────┘
                                                      │ HTTP
                                                      ▼
┌─────────────────────────────────────────────────────┼─────────┐
│                         Backend                     │         │
│                                                     │         │
│  ┌─────────────┐      ┌─────────────┐      ┌──────▼───────┐ │
│  │ Express     │ ───> │ Database    │ ───> │   SQLite     │ │
│  │ API         │      │ Service     │      │   Database   │ │
│  │ (/api/data) │ <─── │             │ <─── │   (db/)      │ │
│  └─────────────┘      └─────────────┘      └──────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. localStorage (Immediate Layer)

**Purpose:** Fast, real-time data access during meetings

- Data is saved immediately when meetings are created or updated
- Provides instant access with no network latency
- Limited to ~5-10MB per domain
- Data survives browser refresh but not browser data clearing

**Storage Structure:**
```javascript
// Main sessions index
localStorage['meetings_agent_sessions'] = [
  { id, title, startTime, endTime, ... }
]

// Detailed data (for sync)
localStorage['meetings-agent-meeting-{id}'] = { meeting metadata }
localStorage['meetings-agent-transcripts-{id}'] = [ transcript entries ]
localStorage['meetings-agent-insights-{id}'] = [ insight entries ]
```

### 2. SQLite Database (Persistent Layer)

**Purpose:** Durable, unlimited server-side storage

- Data persists across devices and browser resets
- No storage limits
- Enables advanced querying and analytics
- Can be backed up and migrated

**Database Location:** `db/meetings.db`

**Schema:**
- `meetings` - Meeting metadata
- `transcripts` - Conversation transcripts
- `insights` - Strategic insights (opportunities, cautions, risks, next steps)

## Automatic Sync

The sync service automatically synchronizes data from localStorage to SQLite.

### Sync Configuration

- **Interval:** Every 30 seconds (configurable)
- **Trigger:** Automatic on data changes + periodic sync
- **Strategy:** Upsert (insert or update)
- **Retry:** Automatic retry on failure

### Sync Flow

1. **Data Written to localStorage** → Storage Service saves data
2. **Sync Marked as Pending** → `syncService.markPendingSync()`
3. **Auto-Sync Timer Triggers** → Every 30 seconds
4. **Data Extracted** → Sync service reads from localStorage
5. **HTTP POST** → Sends to `/api/data/sync`
6. **Database Updated** → Backend upserts to SQLite
7. **Status Updated** → Sync complete, `lastSync` timestamp set

### Manual Sync

You can also trigger sync manually:

```javascript
import { storageService } from './services/storage-service';

// Trigger immediate sync
await storageService.syncToBackend();

// Check sync status
const status = storageService.getSyncStatus();
console.log('Last sync:', new Date(status.lastSync));
console.log('Is syncing:', status.isSyncing);
console.log('Pending sync:', status.pendingSync);

// Subscribe to sync status changes
const unsubscribe = storageService.onSyncStatusChange((status) => {
  console.log('Sync status changed:', status);
});
```

## API Endpoints

### Sync Endpoint

**POST /api/data/sync**

Sync meeting data from frontend to backend.

```json
{
  "meeting": {
    "id": "meeting-123",
    "title": "Q4 Planning",
    "start_time": 1699200000,
    "end_time": 1699203600,
    "status": "completed"
  },
  "transcripts": [
    {
      "id": "t1",
      "meeting_id": "meeting-123",
      "speaker": "user",
      "content": "Let's discuss Q4 goals",
      "timestamp": 1699200030
    }
  ],
  "insights": [
    {
      "id": "i1",
      "meeting_id": "meeting-123",
      "type": "opportunity",
      "content": "Client interested in expanding contract",
      "timestamp": 1699200100,
      "is_read": false
    }
  ]
}
```

### Data Retrieval

**GET /api/data/meetings** - List all meetings
**GET /api/data/meetings/:id** - Get specific meeting with transcripts and insights
**GET /api/data/meetings/:meetingId/transcripts** - Get transcripts for a meeting
**GET /api/data/meetings/:meetingId/insights** - Get insights for a meeting
**GET /api/data/meetings/:id/stats** - Get meeting statistics

### Data Management

**PUT /api/data/meetings/:id** - Update meeting
**DELETE /api/data/meetings/:id** - Delete meeting and related data
**PATCH /api/data/insights/:id/read** - Mark insight as read

## Storage Limits

### localStorage

| Browser | Typical Limit | Notes |
|---------|---------------|-------|
| Chrome  | 10 MB | Per origin |
| Firefox | 10 MB | Per origin |
| Safari  | 5 MB | Per origin |
| Edge    | 10 MB | Per origin |

**Estimated Capacity:**
- 1 hour meeting: ~500 KB (transcripts + insights)
- 10 meetings: ~5 MB
- **Recommendation:** Keep last 20-50 meetings in localStorage

### SQLite Database

- **Theoretical Limit:** 281 TB (140 terabytes)
- **Practical Limit:** Depends on disk space
- **Typical Usage:**
  - 1 hour meeting: ~500 KB
  - 1000 meetings: ~500 MB
  - **No practical limit for meeting storage**

## Data Recovery

### From localStorage

If database is lost, data can be recovered from localStorage:

```javascript
import { storageService } from './services/storage-service';

// Get all sessions from localStorage
const sessions = storageService.getAllSessions();

// Trigger sync to restore to database
await storageService.syncToBackend();
```

### From Database

If localStorage is cleared, data can be restored from database:

```javascript
import { getSyncService } from './services/sync-service';

const syncService = getSyncService();

// Load all meetings from backend
const meetings = await syncService.getAllMeetingsFromBackend();

// Load specific meeting
const meetingData = await syncService.loadMeetingFromBackend('meeting-id');
```

## Backup and Export

### Export from localStorage

```javascript
import { storageService } from './services/storage-service';

// Export all sessions as JSON
const json = storageService.exportSessions();

// Download as file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'meetings-backup.json';
link.click();
```

### Export from Database

```bash
# Backup SQLite database
cp db/meetings.db db/meetings-backup.db

# Export to SQL
sqlite3 db/meetings.db .dump > backup.sql

# Export to CSV
sqlite3 db/meetings.db <<EOF
.headers on
.mode csv
.output meetings.csv
SELECT * FROM meetings;
.output transcripts.csv
SELECT * FROM transcripts;
.output insights.csv
SELECT * FROM insights;
.quit
EOF
```

## Performance Considerations

### localStorage Performance

- **Read:** ~0.5ms per operation (very fast)
- **Write:** ~1-2ms per operation
- **Sync:** Synchronous, blocks main thread
- **Best for:** Frequent reads/writes, real-time updates

### SQLite Performance

- **Read:** ~10-50ms per query (with network)
- **Write:** ~20-100ms per transaction
- **Batch Insert:** ~100-500ms for 1000 records
- **Best for:** Complex queries, large datasets, persistence

### Optimization Tips

1. **Batch sync instead of syncing on every change**
   - Current: Sync every 30 seconds
   - Alternative: Sync only when meeting ends

2. **Use IndexedDB for larger datasets**
   - If localStorage fills up, migrate to IndexedDB
   - IndexedDB supports gigabytes of data

3. **Implement pagination**
   - Load only recent meetings in UI
   - Lazy load older meetings on demand

4. **Enable database indexing**
   - Already implemented in schema
   - Speeds up queries on meeting_id, timestamp, type

## Troubleshooting

### localStorage Quota Exceeded

**Problem:** `QuotaExceededError` when saving to localStorage

**Solution:**
```javascript
// Automatic cleanup is built-in
// Manually clear old sessions:
storageService.clearOldSessions(10); // Keep 10 most recent
```

### Sync Failures

**Problem:** Data not syncing to backend

**Check:**
1. Backend is running: `curl http://localhost:3000/health`
2. Network connectivity
3. Check sync status: `storageService.getSyncStatus()`
4. Check browser console for errors

**Manual retry:**
```javascript
await storageService.syncToBackend();
```

### Database Corruption

**Problem:** SQLite database corrupted

**Recovery:**
```bash
# Check integrity
sqlite3 db/meetings.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
cp db/meetings-backup.db db/meetings.db

# Or reinitialize (data loss)
rm db/meetings.db
# Restart backend - schema will recreate
# Sync from localStorage
```

## Security Considerations

1. **localStorage is browser-local**
   - Data only accessible from same origin
   - Vulnerable to XSS attacks
   - Don't store sensitive API keys

2. **Database is server-side**
   - Protected by server security
   - Not directly accessible from frontend
   - Requires authentication (can be added)

3. **Data transmission**
   - Use HTTPS in production
   - No sensitive data in URLs
   - API keys handled in backend only

4. **Future enhancements**
   - Add authentication to API endpoints
   - Encrypt sensitive meeting content
   - Implement user-based access control

## Monitoring and Observability

### Sync Status UI

Display sync status in the UI:

```jsx
import { storageService } from './services/storage-service';

function SyncStatus() {
  const [status, setStatus] = useState(storageService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = storageService.onSyncStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return (
    <div>
      {status.isSyncing && <Spinner />}
      {status.lastSync && <span>Last sync: {new Date(status.lastSync).toLocaleTimeString()}</span>}
      {status.error && <span>Error: {status.error}</span>}
      {status.pendingSync && <span>Pending sync...</span>}
    </div>
  );
}
```

### Backend Logs

The backend logs all database operations:

```
✅ Database initialized: /path/to/db/meetings.db
🔄 Syncing meeting: meeting-123
✅ Synced 10 transcripts, 5 insights
```

## Future Enhancements

- [ ] Implement conflict resolution for offline edits
- [ ] Add user authentication and multi-user support
- [ ] Implement real-time sync using WebSockets
- [ ] Add database migrations for schema changes
- [ ] Implement data encryption at rest
- [ ] Add full-text search across transcripts
- [ ] Implement automatic backup to cloud storage
- [ ] Add data retention policies and archiving
