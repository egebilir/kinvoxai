# KinvoxAI

AI-Powered Creative Platform — generate text, images, and audio with cutting-edge AI models.

## Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Frontend   | Next.js 14 (TypeScript, strict)    |
| Backend    | Node.js + Express (TypeScript)     |
| Database   | SQLite (file-based, zero config)   |
| Queue      | In-memory (SQLite-backed)          |
| Validation | Zod                                |
| APIs       | Claude, DALL·E, ElevenLabs         |

## Project Structure

```
kinvoxai/
├── frontend/                # Next.js 14 App Router
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx           # Landing page
│   │       ├── dashboard/page.tsx # Dashboard
│   │       └── settings/page.tsx  # Settings
│   ├── package.json
│   └── tsconfig.json
├── backend/                 # Express API server
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── app.ts                 # Express app setup
│   │   ├── config/
│   │   │   ├── database.ts        # SQLite connection
│   │   │   └── queue.ts           # In-memory job queue
│   │   ├── routes/
│   │   │   ├── health.ts          # GET /api/health
│   │   │   ├── generate.ts        # POST /api/generate
│   │   │   └── status.ts          # GET /api/status/:jobId
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── migrations/
│   │       └── seed.ts            # Sample data seeder
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- npm (comes with Node.js)

That's it. No Docker, no PostgreSQL, no Redis.

### 1. Clone & Configure

```bash
git clone https://github.com/egebilir/kinvoxai.git
cd kinvoxai
cp .env.example .env
```

Edit `.env` and add your API keys (optional for initial setup — the app runs without them).

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Start the Backend (Terminal 1)

```bash
cd backend
npm run dev
```

The backend starts on **http://localhost:3001**. SQLite database (`kinvoxai.db`) is created automatically on first run.

### 4. Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend starts on **http://localhost:3000**.

### 5. (Optional) Seed the Database

```bash
cd backend
npm run seed
```

This inserts sample jobs so you can test the status endpoint immediately.

## Verify Everything Works

```bash
# Health check
curl http://localhost:3001/api/health

# Submit a generation job
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello world", "type": "text"}'

# Check job status (use the jobId from the response above)
curl http://localhost:3001/api/status/<jobId>

# List all recent jobs
curl http://localhost:3001/api/status
```

## API Endpoints

| Method | Endpoint             | Description               |
| ------ | -------------------- | ------------------------- |
| GET    | `/api/health`        | Service health check      |
| POST   | `/api/generate`      | Submit generation job     |
| GET    | `/api/status/:jobId` | Check job status          |
| GET    | `/api/status`        | List recent jobs          |

### POST /api/generate

```json
{
  "prompt": "A sunset over mountains",
  "type": "text | image | audio",
  "options": {
    "model": "claude",
    "temperature": 0.7
  }
}
```

### Response (202 Accepted)

```json
{
  "jobId": "job_1718...",
  "status": "queued",
  "message": "Generation request accepted",
  "type": "text",
  "createdAt": "2026-06-17T..."
}
```

### GET /api/health Response

```json
{
  "status": "healthy",
  "timestamp": "2026-06-17T...",
  "services": {
    "database": { "type": "sqlite", "status": "connected", "totalJobs": 3 },
    "queue": { "type": "in-memory", "status": "running" }
  }
}
```

## Environment Variables

See [`.env.example`](.env.example) for all available configuration.

| Variable            | Required | Description                 |
| ------------------- | -------- | --------------------------- |
| `CLAUDE_API_KEY`    | No*      | Anthropic Claude API key    |
| `DALLE_API_KEY`     | No*      | OpenAI DALL·E API key       |
| `ELEVENLABS_API_KEY`| No*      | ElevenLabs TTS API key      |
| `BACKEND_PORT`      | No       | Backend port (default 3001) |
| `FRONTEND_PORT`     | No       | Frontend port (default 3000)|

*API keys are only needed when you implement the actual AI generation logic.

## License

Private — All rights reserved.
