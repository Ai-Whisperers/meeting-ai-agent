import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless function to generate ephemeral tokens for OpenAI Realtime API
 *
 * This endpoint securely generates short-lived tokens that can be safely used
 * in browser environments without exposing the main API key.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key is configured (always use repository secret, fallback to user-provided)
  const apiKey = process.env.OPENAI_API_KEY || req.body?.apiKey || req.headers['x-api-key'] as string;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
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
}
