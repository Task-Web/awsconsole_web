# AWS Console Mock

A fully interactive AWS Management Console simulation built with **Next.js 15**. Features **real EC2 instances** backed by Docker containers with SSH access, cookie-scoped user isolation, and 14+ AWS service UIs.

## Quick Start

```bash
docker compose up --build
```

Open http://localhost:3000. The first run builds AMI images (~2 min), subsequent starts are instant.

## Features

- **Real EC2 Instances**: Launch creates a Docker container. Stop/start/terminate are real Docker operations. SSH into your instances.
- **Real SSH Key Pairs**: Cryptographic RSA/ED25519 key generation. Private key downloaded as `.pem`. Public key injected into instances.
- **Real AMIs**: Docker images matching `awsmock-ami:*` pattern appear as AMIs. Pre-built: Amazon Linux 2023, Ubuntu 22.04.
- **14+ AWS Services**: EC2, S3, Lambda, RDS, IAM, VPC, CloudWatch, DynamoDB, SNS, SQS, CloudFront, Route 53, CloudTrail, Billing.
- **Per-User Isolation**: Each visitor gets isolated state via cookie. EC2 containers are labeled per user.
- **State Reconciliation**: Edit state via `/state-manage` → Docker containers automatically sync.
- **60+ Routes**: Full navigation with sidebar, search, region selector, notifications.

## How EC2 Works

```
Launch Instance → Backend creates Docker container → Container gets IP on awsmock-net
                → SSH ready: ssh -i key.pem root@172.25.x.x

Stop Instance   → docker stop <container>
Start Instance  → docker start <container>
Terminate       → docker rm -f <container>

List AMIs       → docker images awsmock-ami:*
Create Key Pair → crypto.generateKeyPairSync() → .pem downloaded
```

## Architecture

```
awsconsole_web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/
│   │   │   ├── state/           # GET/PUT/PATCH/DELETE /api/state (+ reconciliation)
│   │   │   ├── ec2/
│   │   │   │   ├── instances/   # Launch/list/stop/start/terminate
│   │   │   │   ├── amis/        # List AMIs from Docker images
│   │   │   │   └── keypairs/    # Create/list/delete SSH key pairs
│   │   │   ├── files/           # File upload/download
│   │   │   └── info/            # System info
│   │   ├── health/              # Health check
│   │   ├── state-manage/        # State management UI
│   │   ├── [...path]/           # Catch-all for SPA routes
│   │   └── page.tsx             # Root page
│   ├── components/
│   │   ├── aws/                 # AWS Console UI
│   │   │   ├── AwsApp.jsx       # React Router SPA (60+ routes)
│   │   │   ├── Layout.jsx       # Header, sidebar, navigation
│   │   │   ├── store/           # StoreContext (reducer) + dataManager (seed data)
│   │   │   └── pages/           # 53+ page components
│   │   └── StateEditor.tsx      # State management editor
│   └── lib/                     # Server-side utilities
│       ├── docker-client.ts     # Docker API (create/stop/start/rm containers)
│       ├── ec2-reconciler.ts    # State ↔ Docker sync
│       ├── keypair-manager.ts   # SSH key generation + storage
│       ├── state-store.ts       # In-memory state store
│       ├── cookies.ts           # Cookie-scoped identity
│       └── file-store.ts        # File uploads
├── images/                      # AMI Dockerfiles
│   ├── amazon-linux/Dockerfile  # Amazon Linux 2023 + sshd
│   └── ubuntu/Dockerfile        # Ubuntu 22.04 + sshd
├── docker-compose.yml           # App + AMI builder + network
├── Dockerfile                   # Next.js production build
└── constitution.md              # Core principles
```

## API Endpoints

### State Management (cookie-scoped)

- `GET /api/state` - Retrieve current user state
- `PUT /api/state` - Replace entire state (triggers EC2 reconciliation)
- `PATCH /api/state` - Merge into existing state
- `DELETE /api/state` - Reset state + terminate all EC2 containers

### EC2 (Docker-backed)

- `GET /api/ec2/amis` - List available AMIs
- `GET /api/ec2/instances` - List user's instances
- `POST /api/ec2/instances` - Launch new instance
- `GET /api/ec2/instances/:id` - Instance details
- `DELETE /api/ec2/instances/:id` - Terminate instance
- `POST /api/ec2/instances/:id/start` - Start stopped instance
- `POST /api/ec2/instances/:id/stop` - Stop running instance
- `GET /api/ec2/keypairs` - List key pairs
- `POST /api/ec2/keypairs` - Create key pair (returns private key once)
- `GET /api/ec2/keypairs/:name` - Key pair details
- `DELETE /api/ec2/keypairs/:name` - Delete key pair

### Other

- `POST /api/files` - Upload files
- `GET /api/files` - List user's files
- `GET /api/files/:filename` - Download file
- `GET /api/info` - System information
- `GET /health` - Health check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COOKIE_NAME` | `user_id` | Cookie name for user identity |
| `COOKIE_MAX_AGE` | `2592000` (30 days) | Cookie max age in seconds |
| `EC2_NETWORK` | `awsmock-net` | Docker network for EC2 containers |
| `EC2_AMI_PATTERN` | `awsmock-ami` | Docker image prefix for AMIs |
| `EC2_MAX_PER_USER` | `5` | Max EC2 instances per user |
| `NODE_ENV` | `development` | Node environment |

## Development

```bash
npm install
npm run dev          # Start dev server (EC2 features need Docker socket)
npm run build        # Production build
npm run lint         # Lint
npm run test         # Run tests
```

For EC2 features in dev mode, ensure Docker is running and the `awsmock-net` network exists:

```bash
docker network create awsmock-net
docker build -t awsmock-ami:amazon-linux-2023 images/amazon-linux/
docker build -t awsmock-ami:ubuntu-22.04 images/ubuntu/
```

## Identity & Isolation

- Each user is identified by a `user_id` cookie (auto-generated UUID)
- Override identity via query parameter: `?cookie=my-custom-id`
- All state, files, EC2 containers, and key pairs are scoped to the cookie
- `/state-manage` provides a raw JSON editor for the full state
