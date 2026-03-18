# AWS Console Mock — State Reference

This document describes the per-user state structure. The backend stores a `UserState` envelope with a free-form `data` object containing all AWS service state. Each user gets an isolated copy identified by a `user_id` cookie.

All timestamps are ISO 8601 strings (UTC).

## State Envelope (UserState)

| Field | Type | Description |
|-------|------|-------------|
| `meta.created_at` | string | When the state was created |
| `meta.updated_at` | string | Last update time |
| `meta.version` | number | Incremented on each patch |
| `meta.type` | string | Currently `"unrestricted"` |
| `data` | object | All AWS service state (see below) |
| `note` | string \| null | Optional human-readable note |

When replacing state via `PUT /api/state`, you may include a `meta` object. If omitted, the backend generates new metadata.

## Data Shape Overview

The `data` object contains all AWS service state. EC2 instances and key pairs are backed by real Docker containers and cryptographic keys — other services are mock data.

| Key | Type | Real/Mock | Description |
|-----|------|-----------|-------------|
| `user` | object | mock | Account info (name, email, accountId, region, role) |
| `recentServices` | array | mock | Recently visited services |
| `favorites` | array | mock | Favorited sidebar paths |
| `ec2` | Ec2Instance[] | **real** | EC2 instances (Docker containers) |
| `amis` | Ami[] | **real** | AMIs (Docker images matching `awsmock-ami:*`) |
| `keyPairs` | KeyPair[] | **real** | SSH key pairs (real crypto keys) |
| `volumes` | Volume[] | mock | EBS volumes |
| `snapshots` | Snapshot[] | mock | EBS snapshots |
| `elasticIps` | ElasticIp[] | mock | Elastic IP addresses |
| `loadBalancers` | LoadBalancer[] | mock | ALB/NLB load balancers |
| `targetGroups` | TargetGroup[] | mock | Target groups |
| `autoScalingGroups` | ASG[] | mock | Auto Scaling groups |
| `launchTemplates` | LaunchTemplate[] | mock | Launch templates |
| `securityGroups` | SecurityGroup[] | mock | Security groups |
| `s3` | Bucket[] | mock | S3 buckets with objects |
| `lambda` | LambdaFunction[] | mock | Lambda functions |
| `lambdaLayers` | LambdaLayer[] | mock | Lambda layers |
| `rds` | RdsInstance[] | mock | RDS database instances |
| `rdsSnapshots` | RdsSnapshot[] | mock | RDS snapshots |
| `rdsSubnetGroups` | SubnetGroup[] | mock | RDS subnet groups |
| `rdsParameterGroups` | ParameterGroup[] | mock | RDS parameter groups |
| `iam` | object | mock | IAM (users, roles, policies, groups, identityProviders, accountSettings) |
| `vpc` | object | mock | VPC (vpcs, subnets, routeTables, internetGateways, natGateways) |
| `cloudwatch` | object | mock | CloudWatch (alarms, logGroups, dashboards, metrics) |
| `dynamodb` | object | mock | DynamoDB (tables) |
| `sns` | object | mock | SNS (topics, subscriptions) |
| `sqs` | object | mock | SQS (queues) |
| `cloudfront` | object | mock | CloudFront (distributions) |
| `route53` | object | mock | Route 53 (hostedZones, records) |
| `billing` | object | mock | Billing (currentMonth, forecast, history, byService, budgets, etc.) |
| `notifications` | Notification[] | mock | System notifications |
| `flash` | Flash[] | mock | Transient flash messages |

## Real (Docker-Backed) Types

### Ec2Instance

Stored in `data.ec2[]`. Each entry corresponds to a real Docker container.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Instance ID (e.g., `i-0a1b2c3d4e5f6g7h`) |
| `name` | string | Instance name |
| `type` | string | Instance type (e.g., `t2.micro`) |
| `state` | string | `running`, `stopped`, `pending`, `shutting-down`, `terminated` |
| `publicIp` | string | Container IP on Docker network |
| `privateIp` | string | Container IP on Docker network |
| `az` | string | Availability zone (e.g., `us-east-1a`) |
| `ami` | string | AMI ID |
| `amiName` | string | AMI display name |
| `platform` | string | `Linux/UNIX` or `Windows` |
| `keyPair` | string | Key pair name (empty if none) |
| `securityGroups` | string[] | Security group IDs |
| `launchTime` | string | ISO timestamp |
| `monitoring` | string | `disabled` or `enabled` |
| `tags` | Tag[] | `[{ Key, Value }]` |
| `containerId` | string | Docker container ID |
| `sshCommand` | string | SSH command (e.g., `ssh -i key.pem root@172.25.0.2`) |
| `vpcId` | string | VPC ID |
| `subnetId` | string | Subnet ID |

### Ami

Stored in `data.amis[]`. Populated from Docker images matching `awsmock-ami:*`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | AMI ID (derived from Docker image hash) |
| `name` | string | AMI name (from Docker label `awsmock.ami.name`) |
| `description` | string | Description (from Docker label) |
| `owner` | string | `local` |
| `state` | string | `available` |
| `architecture` | string | `x86_64` |
| `platform` | string | `Linux` or `Windows` |
| `imageTag` | string | Docker image tag (e.g., `awsmock-ami:ubuntu-22.04`) |
| `created` | string | ISO timestamp |

### KeyPair

Stored in `data.keyPairs[]`. Generated via real `crypto.generateKeyPairSync`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Key pair name |
| `id` | string | Key pair ID (e.g., `key-0abc1234def56789`) |
| `type` | string | `RSA` or `ED25519` |
| `fingerprint` | string | MD5 fingerprint of public key |
| `publicKey` | string | Public key (stored server-side) |
| `created` | string | ISO timestamp |

Private key is returned **once** on creation (via `POST /api/ec2/keypairs`) and never stored.

## EC2 Reconciliation

When `data.ec2` is modified via `PUT /api/state` or `PATCH /api/state` (without `x-reconcile-skip: true` header), Docker containers are reconciled:

| Condition | Action |
|-----------|--------|
| Instance in state, no Docker container | Container created from matching AMI |
| Docker container exists, not in state | Container terminated |
| State says `stopped`, container running | Container stopped |
| State says `running`, container stopped | Container started |
| State says `terminated` | Container removed |

After reconciliation, `data.ec2` is overwritten with actual Docker container state.

The frontend's automatic state sync includes `x-reconcile-skip: true` to avoid triggering reconciliation on every dispatch. Reconciliation only triggers on:
- **`/state-manage` page** "Save" button
- **External API calls** (e.g., `curl -X PUT /api/state`)
- **`DELETE /api/state`** (terminates all user containers)

## State Reset

`DELETE /api/state` performs:
1. Terminates all Docker containers for the user
2. Deletes all uploaded files
3. Resets state to defaults (empty `ec2`, `amis`, `keyPairs`)

## Full Example

```json
{
  "meta": {
    "created_at": "2024-04-01T12:00:00Z",
    "updated_at": "2024-04-01T12:30:00Z",
    "version": 3,
    "type": "unrestricted"
  },
  "data": {
    "user": {
      "name": "Admin User",
      "email": "admin@company.com",
      "accountId": "1234-5678-9012",
      "region": "us-east-1",
      "accountAlias": "my-company-prod",
      "role": "admin"
    },
    "ec2": [
      {
        "id": "i-230485f03be75d2e",
        "name": "Web-Server",
        "type": "t2.micro",
        "state": "running",
        "publicIp": "172.25.0.2",
        "privateIp": "172.25.0.2",
        "az": "us-east-1a",
        "ami": "ami-8301c1665d9c",
        "amiName": "Amazon Linux 2023 AMI",
        "platform": "Linux/UNIX",
        "keyPair": "my-key",
        "sshCommand": "ssh -i my-key.pem root@172.25.0.2",
        "containerId": "a7211d740e98...",
        "launchTime": "2026-03-18T07:01:00Z",
        "tags": [{ "Key": "Name", "Value": "Web-Server" }]
      }
    ],
    "amis": [
      {
        "id": "ami-8301c1665d9c",
        "name": "Amazon Linux 2023 AMI",
        "imageTag": "awsmock-ami:amazon-linux-2023",
        "platform": "Linux",
        "state": "available"
      }
    ],
    "keyPairs": [
      {
        "name": "my-key",
        "id": "key-a1b2c3d4e5f6",
        "type": "RSA",
        "fingerprint": "a1:b2:c3:..."
      }
    ],
    "s3": [],
    "lambda": [],
    "rds": [],
    "iam": { "users": [], "roles": [], "policies": [], "groups": [] },
    "vpc": { "vpcs": [], "subnets": [] },
    "notifications": [],
    "flash": []
  },
  "note": null
}
```
