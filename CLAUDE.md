# CLAUDE.md

## Project Overview

Base Experiment Site is a cookie-scoped experiment playground built with Next.js 15. Each visitor gets an isolated state slice tracked via a cookie. State can be read, replaced, patched, or reset through REST APIs. No authentication required.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run with Docker (production mode)
docker compose up --build
```

Open http://localhost:3000

## Stop

```bash
# Stop dev server: Ctrl+C

# Stop Docker
docker compose down
```

## Constitution

**READ FIRST**: Before making changes, read `constitution.md`. It defines:
- Cookie-scoped state isolation requirements
- API contract stability rules
- Documentation requirements
- Testing gates

## Documentation Requirements

When modifying this project, keep documentation in sync:

| Change Type | Update |
|-------------|--------|
| State fields/schema | `docs/STATE.md` + `src/lib/types.ts` |
| API endpoints | `docs/API.md` |
| Breaking changes | Both docs + migration plan |

## Key Files

- `src/app/api/state/route.ts` - State CRUD endpoints
- `src/app/api/files/route.ts` - File upload/list
- `src/lib/state-store.ts` - In-memory state storage
- `src/lib/types.ts` - TypeScript type definitions
- `src/app/state-manage/page.tsx` - State management UI (constitutional requirement)

## API Endpoints

See `docs/API.md` for full API documentation.
