# CLAUDE.md

## Project Overview

AWS Console Mock is a cookie-scoped AWS Management Console simulation built with Next.js 15. It provides a fully interactive mock of 14+ AWS services with **real EC2 instances** backed by Docker containers. Each visitor gets isolated state tracked via a cookie. All state changes synchronize with the backend in real time.

**EC2 instances are real**: launching an instance creates a Docker container with SSH access. AMIs map to Docker images (`awsmock-ami:*`). Key pairs use real cryptographic keys.

## Quick Start

```bash
# Production (recommended) - builds app + AMI images, starts everything
docker compose up --build

# Development (no real EC2 - Docker socket needed for EC2 features)
npm install
npm run dev
```

Open http://localhost:3000

## Stop

```bash
# Stop Docker
docker compose down

# Stop dev server: Ctrl+C
```

## Constitution

**READ FIRST**: Before making changes, read `constitution.md`. It defines:
- Cookie-scoped state isolation requirements
- API contract stability rules
- Documentation requirements
- Testing gates

## Architecture

```
Browser → Next.js (port 3000)
           ├── /api/state          → cookie-scoped state store (all services)
           ├── /api/ec2/instances  → dockerode → Docker Engine (real containers)
           ├── /api/ec2/amis       → Docker images matching awsmock-ami:*
           ├── /api/ec2/keypairs   → real crypto key generation
           └── React SPA           → AWS Console UI (60+ routes)
```

- **Backend**: Next.js API routes for cookie-scoped state + Docker container management
- **Frontend**: React SPA with React Router for client-side navigation
- **State Sync**: Frontend dispatches to local reducer AND syncs to `/api/state` via PUT
- **EC2 Reconciliation**: When state is updated externally (e.g., via `/state-manage`), Docker containers are automatically created/stopped/terminated to match

### Key Directories

- `src/app/api/` - Backend API routes (state, files, EC2, keypairs)
- `src/app/api/ec2/` - EC2 Docker management APIs
- `src/components/aws/` - AWS Console UI components
- `src/components/aws/store/` - State management (StoreContext + dataManager)
- `src/components/aws/pages/` - 53+ page components for all AWS services
- `src/lib/` - Server-side utilities (Docker client, key pair manager, reconciler)
- `images/` - Dockerfiles for AMI images (Amazon Linux, Ubuntu)

## Key Files

- `src/app/api/state/route.ts` - State CRUD + EC2 reconciliation trigger
- `src/lib/docker-client.ts` - Docker API wrapper (create/stop/start/terminate containers)
- `src/lib/ec2-reconciler.ts` - State-to-Docker reconciliation logic
- `src/lib/keypair-manager.ts` - Real SSH key pair generation and storage
- `src/components/aws/store/StoreContext.jsx` - Frontend state reducer + API sync
- `src/components/aws/store/dataManager.js` - Default state data (seed state)
- `src/components/aws/AwsApp.jsx` - Main SPA router (60+ routes)
- `src/components/aws/Layout.jsx` - AWS Console layout (header, sidebar, navigation)
- `src/app/state-manage/page.tsx` - State management UI (constitutional requirement)

## EC2 Docker Integration

### How it works
- **AMIs** = Docker images tagged `awsmock-ami:*` (built by `ami-builder` service)
- **Instances** = Docker containers on `awsmock-net` network
- **Key Pairs** = Real RSA/ED25519 keys (private key downloaded once, public key injected into containers)
- **SSH**: `ssh -i mykey.pem root@<container-ip>` or `ssh root@<ip>` (password: `password`)

### Reconciliation
When state is modified via `/state-manage` or external API calls (without `x-reconcile-skip` header):
- Instance in state but no container → container created
- Container exists but not in state → container terminated
- State says stopped but container running → container stopped
- State says running but container stopped → container started

Frontend auto-sync includes `x-reconcile-skip: true` to avoid triggering reconciliation on every dispatch.

### Resource limits by instance type
| Type | CPU | Memory |
|------|-----|--------|
| t2.micro | 0.25 | 256 MB |
| t2.small | 0.5 | 512 MB |
| t3.medium | 1.0 | 1 GB |
| m5.large | 1.0 | 1 GB |
| c5.xlarge | 2.0 | 2 GB |

## API Endpoints

### State Management (cookie-scoped)
- `GET/PUT/PATCH/DELETE /api/state` - See `docs/API.md`

### EC2 (Docker-backed)
- `GET /api/ec2/amis` - List AMIs (from Docker images)
- `GET/POST /api/ec2/instances` - List/launch instances
- `GET/DELETE /api/ec2/instances/:id` - Get/terminate instance
- `POST /api/ec2/instances/:id/start` - Start stopped instance
- `POST /api/ec2/instances/:id/stop` - Stop running instance
- `GET/POST /api/ec2/keypairs` - List/create key pairs
- `GET/DELETE /api/ec2/keypairs/:name` - Get/delete key pair

### Other
- `POST/GET /api/files` - File upload/list
- `GET /api/files/:filename` - File download
- `GET /api/info` - System info
- `GET /health` - Health check
