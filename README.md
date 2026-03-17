# Base Experiment Site

Cookie-scoped experiment playground built with **Next.js 15**. Each visitor gets an isolated state slice tracked via a cookie; state can be read, replaced, patched, or reset through well-documented APIs and a fully featured UI for experiments.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs as a unified Next.js application with API routes and frontend in one project.

## Docker compose

```bash
docker compose up --build
```

Open http://localhost:3000.

## Highlights

- Per-user state keyed by cookie; no login required.
- REST endpoints for state lifecycle (`GET/PUT/PATCH/DELETE /api/state`) plus system info and health.
- You can pin identity via querystring `?cookie=your-id` on any page or API call; the app will set that as the response cookie.
- Frontend uses Tailwind CSS for styling.
- Initial state includes an example Hugging Face file URL (no verification).
- File uploads are stored on the server and referenced by URL.
- `/state-manage` page with documentation tab and live editor tab (constitutional requirement).

## Repository layout

```
basesite/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API routes
│   │   │   ├── state/       # GET/PUT/PATCH/DELETE /api/state
│   │   │   ├── info/        # GET /api/info
│   │   │   └── files/       # POST/GET /api/files, GET /api/files/[filename]
│   │   ├── health/          # GET /health
│   │   ├── state-manage/    # State management page (constitutional requirement)
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   └── StateEditor.tsx  # Main state editor component
│   └── lib/                 # Server-side utilities
│       ├── types.ts         # TypeScript types
│       ├── state-store.ts   # In-memory state store
│       ├── file-store.ts    # File upload handling
│       └── cookies.ts       # Cookie management
├── uploads/                 # Uploaded files directory
├── constitution.md          # Core principles and constraints
├── Dockerfile              # Production Docker build
├── docker-compose.yml      # Docker compose config
└── package.json            # Dependencies and scripts
```

## API Endpoints

See [docs/API.md](docs/API.md) for full API documentation with request/response examples.

### State Management (cookie-scoped)

- `GET /api/state` - Retrieve current user state
- `PUT /api/state` - Replace entire state
- `PATCH /api/state` - Merge into existing state
- `DELETE /api/state` - Reset and clear state

### File Operations

- `POST /api/files` - Upload files
- `GET /api/files` - List user's files
- `GET /api/files/{filename}` - Download stored file

### System Info

- `GET /api/info` - System and request information
- `GET /health` - Health check

## Testing

```bash
npm run test        # Run tests in watch mode
npm run test:run    # Run tests once
```

## Environment variables

- `COOKIE_NAME` (default `user_id`)
- `COOKIE_MAX_AGE` (seconds, default 30 days)
- `NODE_ENV` (development/production)

## Documentation

- [docs/STATE.md](docs/STATE.md) - State structure and data schema reference
- [docs/API.md](docs/API.md) - Complete API endpoint documentation

## Development tips

- Use `npm run lint` for linting.
- When adding state fields, update the TypeScript types in `src/lib/types.ts` and `docs/STATE.md`.
- When changing API endpoints (routes, request/response shapes, error codes), update `docs/API.md`.
- The `/state-manage` page must always be preserved with both documentation and live editor tabs (constitutional requirement).
