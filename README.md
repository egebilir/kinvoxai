# KinvoxAI

AI-Powered Creative Platform — generate text, images, and audio with cutting-edge AI models.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | Next.js 14 (TypeScript, strict)     |
| Backend    | Node.js + Express (TypeScript)      |
| Database   | PostgreSQL 16                       |
| Queue      | Redis 7 + BullMQ                    |
| Infra      | Docker Compose                      |
| Validation | Zod                                 |
| APIs       | Claude, DALL·E, ElevenLabs, Paddle  |

## Project Structure

```
kinvoxai/
├── frontend/                # Next.js 14 App Router
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx           # Landing page
│   │       ├── dashboard/page.tsx # Dashboard
│   │       └── settings/page.tsx  # Settings
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── backend/                 # Express API server
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── app.ts                 # Express app setup
│   │   ├── config/
│   │   │   ├── database.ts        # PostgreSQL pool
│   │   │   ├── redis.ts           # Redis client
│   │   │   └── queue.ts           # BullMQ setup
│   │   ├── routes/
│   │   │   ├── health.ts          # GET /api/health
│   │   │   ├── generate.ts        # POST /api/generate
│   │   │   └── status.ts          # GET /api/status/:jobId
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── migrations/            # DB migrations (empty)
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local dev without Docker)

### 1. Clone & Configure

```bash
git clone https://github.com/egebilir/kinvoxai.git
cd kinvoxai
cp .env.example .env
```

Edit `.env` and fill in your API keys (optional for initial setup).

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

This starts all four services:

| Service    | URL                          | Health Check              |
| ---------- | ---------------------------- | ------------------------- |
| Frontend   | http://localhost:3000         | `GET /`                   |
| Backend    | http://localhost:3001         | `GET /api/health`         |
| PostgreSQL | localhost:5432               | `pg_isready`              |
| Redis      | localhost:6379               | `redis-cli ping`          |

### 3. Verify Services

```bash
# Backend health
curl http://localhost:3001/api/health

# Test generate endpoint
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello world", "type": "text"}'

# Check job status
curl http://localhost:3001/api/status/job_123
```

### Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint             | Description               |
| ------ | -------------------- | ------------------------- |
| GET    | `/api/health`        | Service health check      |
| POST   | `/api/generate`      | Submit generation job     |
| GET    | `/api/status/:jobId` | Check job status          |

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

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

| Variable              | Description                          |
| --------------------- | ------------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string         |
| `REDIS_URL`           | Redis connection string              |
| `CLAUDE_API_KEY`      | Anthropic Claude API key             |
| `OPENAI_API_KEY`      | OpenAI (DALL·E) API key              |
| `ELEVENLABS_API_KEY`  | ElevenLabs TTS API key               |
| `PADDLE_API_KEY`      | Paddle payment API key               |

## License

Private — All rights reserved.
