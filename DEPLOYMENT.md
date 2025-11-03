# Deployment Guide

This guide covers how to deploy the Meetings Agent application using Docker or Render.

## Docker Deployment

The application is fully dockerized and can be run with Docker Compose.

### Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose installed
- OpenAI API key with Realtime API access

### Quick Start with Docker

1. **Set up environment variables**

```bash
# Copy the example env file
cp backend/.env.example backend/.env

# Edit backend/.env and add your OpenAI API key
# OPENAI_API_KEY=sk-proj-your-actual-key-here
```

2. **Build and run with Docker Compose**

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

3. **Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Backend Health: http://localhost:3000/health

4. **Stop the services**

```bash
docker-compose down
```

### Individual Container Commands

**Backend only:**
```bash
cd backend
npm run docker:build
npm run docker:run
```

**Frontend only:**
```bash
cd frontend
docker build -t meetings-agent-frontend \
  --build-arg VITE_API_URL=http://localhost:3000 .
docker run -p 5173:80 meetings-agent-frontend
```

## Render Deployment

Deploy to Render using the included `render.yaml` blueprint.

### Prerequisites

- Render account
- GitHub repository connected to Render
- OpenAI API key

### Deployment Steps

1. **Push to GitHub**

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

2. **Create New Blueprint in Render**

- Go to https://render.com/dashboard
- Click "New" → "Blueprint"
- Connect your GitHub repository
- Select the repository with this code
- Render will auto-detect `render.yaml`

3. **Configure Environment Variables**

In the Render dashboard, add the following environment variable for the backend service:

- Key: `OPENAI_API_KEY`
- Value: `sk-proj-your-actual-key-here`
- **Important**: Mark as "Secret"

4. **Deploy**

- Click "Apply" to start deployment
- Wait for both services to deploy
- Frontend URL will be: `https://meetings-agent-frontend.onrender.com`
- Backend URL will be: `https://meetings-agent-backend.onrender.com`

### Manual Service Creation (Alternative)

If you prefer manual setup instead of the blueprint:

**Backend Service:**
- Type: Web Service
- Environment: Node
- Build Command: `cd backend && npm install && npm run build`
- Start Command: `cd backend && npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `OPENAI_API_KEY=<your-key>`

**Frontend Service:**
- Type: Static Site
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Environment Variables:
  - `VITE_API_URL=<backend-service-url>`

## Local Development

### Prerequisites

- Node.js 18+ installed
- OpenAI API key

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run development server
npm run dev
```

Backend runs on: http://localhost:3000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Verify VITE_API_URL=http://localhost:3000

# Run development server
npm run dev
```

Frontend runs on: http://localhost:5173

## Environment Variables

### Backend

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key | - |
| `PORT` | No | Port for backend server | 3000 |
| `NODE_ENV` | No | Environment mode | development |

### Frontend

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | http://localhost:3000 |

## Production Checklist

- [ ] Environment variables configured securely
- [ ] API keys stored as secrets (not committed to git)
- [ ] CORS properly configured for your domain
- [ ] HTTPS enabled (automatic on Render)
- [ ] Health checks working
- [ ] Error logging configured
- [ ] Monitoring set up (optional)

## Troubleshooting

### Docker Issues

**Problem**: Port already in use
```bash
# Find and kill the process using the port
lsof -i :3000  # or :5173
kill -9 <PID>

# Or change ports in docker-compose.yml
```

**Problem**: Build fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Render Issues

**Problem**: Build fails
- Check build logs in Render dashboard
- Verify `render.yaml` syntax
- Ensure all dependencies are in `package.json`

**Problem**: Backend can't connect to OpenAI
- Verify `OPENAI_API_KEY` is set correctly
- Check it's marked as "Secret" in Render
- Restart the service after adding environment variables

**Problem**: Frontend can't connect to backend
- Verify `VITE_API_URL` is set to backend URL
- Check CORS configuration in backend
- Verify both services are running

## Architecture Notes

### Backend

- Express.js server
- TypeScript
- Single `/api/session` endpoint for token generation
- Health check at `/health`
- CORS enabled for frontend access

### Frontend

- React + TypeScript
- Vite build tool
- Custom WebRTC client for OpenAI Realtime API
- No external API dependencies
- Served via Nginx in production (Docker)

### Communication Flow

1. Frontend requests ephemeral token from backend
2. Backend generates token using OpenAI API
3. Frontend uses token to connect to OpenAI Realtime API via WebSocket
4. Audio streams directly from browser to OpenAI
5. Transcripts and insights stream back in real-time

## Cost Considerations

- Render free tier: 750 hours/month (enough for testing)
- OpenAI Realtime API: ~$0.06/minute input + text costs
- Estimated: ~$3.60/hour of meeting time

## Security Notes

- API keys never exposed to frontend
- Ephemeral tokens used in browser (expire in 1-2 hours)
- All data stays in browser localStorage
- No server-side data storage
- HTTPS enforced in production
