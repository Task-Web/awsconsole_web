# CLAUDE.md

## Project Overview

AWS Console Mock is a cookie-scoped AWS Management Console simulation built with Next.js 15. It provides a fully interactive mock of 14+ AWS services (EC2, S3, Lambda, RDS, IAM, VPC, CloudWatch, DynamoDB, SNS, SQS, CloudFront, Route 53, CloudTrail, Billing). Each visitor gets isolated state tracked via a cookie. All state changes synchronize with the backend in real time.

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

## Architecture

The app uses a hybrid architecture:
- **Backend**: Next.js API routes (basesite framework) for cookie-scoped state management
- **Frontend**: React SPA with React Router for client-side navigation within the AWS Console UI
- **State Sync**: Every frontend state change dispatches to a local reducer AND syncs to `/api/state` via PUT

### Key Directories

- `src/app/api/` - Backend API routes (state, files, info)
- `src/components/aws/` - AWS Console UI components
- `src/components/aws/store/` - State management (StoreContext + dataManager)
- `src/components/aws/pages/` - 53+ page components for all AWS services
- `src/app/state-manage/` - State management UI (constitutional requirement)

## Key Files

- `src/app/api/state/route.ts` - State CRUD endpoints
- `src/app/api/files/route.ts` - File upload/list
- `src/lib/state-store.ts` - In-memory state storage
- `src/lib/types.ts` - TypeScript type definitions
- `src/components/aws/store/StoreContext.jsx` - Frontend state reducer + API sync
- `src/components/aws/store/dataManager.js` - Default AWS mock data (seed state)
- `src/components/aws/AwsApp.jsx` - Main SPA router
- `src/components/aws/Layout.jsx` - AWS Console layout (header, sidebar, navigation)
- `src/app/state-manage/page.tsx` - State management UI (constitutional requirement)

## API Endpoints

See `docs/API.md` for full API documentation.
