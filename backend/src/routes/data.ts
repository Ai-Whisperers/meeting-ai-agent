import { Router, Request, Response } from 'express';
import { getDatabase } from '../services/database.js';

const router = Router();
const db = getDatabase();

// ===== SYNC ENDPOINT =====

/**
 * POST /api/data/sync
 * Sync meeting data from localStorage to SQLite
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { meeting, transcripts, insights } = req.body;

    if (!meeting || !meeting.id) {
      return res.status(400).json({ error: 'Meeting data is required' });
    }

    // Sync data to database
    const result = db.syncMeetingData({
      meeting,
      transcripts: transcripts || [],
      insights: insights || []
    });

    return res.status(200).json({
      success: true,
      message: 'Data synced successfully',
      data: result
    });

  } catch (error) {
    console.error('Error syncing data:', error);
    return res.status(500).json({
      error: 'Failed to sync data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== MEETINGS ENDPOINTS =====

/**
 * GET /api/data/meetings
 * Get all meetings
 */
router.get('/meetings', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const meetings = db.getAllMeetings(limit, offset);

    return res.status(200).json({
      success: true,
      data: meetings,
      count: meetings.length
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return res.status(500).json({
      error: 'Failed to fetch meetings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/data/meetings/:id
 * Get a specific meeting with all related data
 */
router.get('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const meeting = db.getMeeting(id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const transcripts = db.getTranscriptsByMeeting(id);
    const insights = db.getInsightsByMeeting(id);
    const stats = db.getMeetingStats(id);

    return res.status(200).json({
      success: true,
      data: {
        meeting,
        transcripts,
        insights,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching meeting:', error);
    return res.status(500).json({
      error: 'Failed to fetch meeting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/data/meetings/:id
 * Update a meeting
 */
router.put('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const meeting = db.updateMeeting(id, updates);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.status(200).json({
      success: true,
      data: meeting
    });

  } catch (error) {
    console.error('Error updating meeting:', error);
    return res.status(500).json({
      error: 'Failed to update meeting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/data/meetings/:id
 * Delete a meeting and all related data
 */
router.delete('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = db.deleteMeeting(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting meeting:', error);
    return res.status(500).json({
      error: 'Failed to delete meeting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== TRANSCRIPTS ENDPOINTS =====

/**
 * GET /api/data/meetings/:meetingId/transcripts
 * Get all transcripts for a meeting
 */
router.get('/meetings/:meetingId/transcripts', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;

    const transcripts = db.getTranscriptsByMeeting(meetingId);

    return res.status(200).json({
      success: true,
      data: transcripts,
      count: transcripts.length
    });

  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return res.status(500).json({
      error: 'Failed to fetch transcripts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== INSIGHTS ENDPOINTS =====

/**
 * GET /api/data/meetings/:meetingId/insights
 * Get all insights for a meeting
 */
router.get('/meetings/:meetingId/insights', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;

    const insights = db.getInsightsByMeeting(meetingId);

    return res.status(200).json({
      success: true,
      data: insights,
      count: insights.length
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    return res.status(500).json({
      error: 'Failed to fetch insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/data/insights/:id/read
 * Mark an insight as read
 */
router.patch('/insights/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updated = db.markInsightAsRead(id);

    if (!updated) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Insight marked as read'
    });

  } catch (error) {
    console.error('Error marking insight as read:', error);
    return res.status(500).json({
      error: 'Failed to mark insight as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== STATISTICS ENDPOINTS =====

/**
 * GET /api/data/meetings/:id/stats
 * Get statistics for a meeting
 */
router.get('/meetings/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stats = db.getMeetingStats(id);

    if (!stats) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
