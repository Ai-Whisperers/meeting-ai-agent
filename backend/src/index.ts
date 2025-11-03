import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dataRoutes from './routes/data.js';
import { getDatabase } from './services/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = getDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Data persistence routes
app.use('/api/data', dataRoutes);

// Session token generation endpoint
app.post('/api/session', async (req: Request, res: Response) => {
  try {
    // Validate API key (priority: env var > request body > header)
    const apiKey = process.env.OPENAI_API_KEY ||
                   req.body?.apiKey ||
                   req.headers['x-api-key'] as string;

    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to generate session token',
        details: errorText
      });
    }

    const data = await response.json();

    // Return ephemeral token to client
    return res.status(200).json({
      ephemeralToken: data.client_secret?.value || data.client_secret,
      expiresAt: data.expires_at,
      sessionId: data.id
    });

  } catch (error) {
    console.error('Error generating ephemeral token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Session endpoint: http://localhost:${PORT}/api/session`);
  console.log(`💾 Data API: http://localhost:${PORT}/api/data`);
});
