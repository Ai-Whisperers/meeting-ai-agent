# Meetings Agent Backend

Minimal serverless backend for generating ephemeral tokens for OpenAI Realtime API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

## Development

```bash
npm run dev
```

API will be available at `http://localhost:3000`

## Deployment

Deploy to Vercel:
```bash
npm run deploy
```

Set environment variable in Vercel dashboard:
- `OPENAI_API_KEY`: Your OpenAI API key

## API Endpoints

### POST /api/session

Generates an ephemeral token for the Realtime API.

**Response:**
```json
{
  "ephemeralToken": "ek_...",
  "expiresAt": "2025-11-01T12:00:00Z"
}
```
