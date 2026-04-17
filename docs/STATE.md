# AWS Console State Reference

This document describes the persisted state used by `awsconsole_web`.

The backend stores a cookie-scoped `UserState` envelope. The AWS console frontend reads and
writes the `state.data` payload as a mock AWS account snapshot seeded by
`src/components/aws/store/dataManager.js`.

Most timestamps are ISO 8601 UTC strings. The main exception is `flash[].timestamp`, which is a
numeric `Date.now()` value.

## Load and sync behavior

- Server defaults come from `createDefaultState()` in `src/lib/types.ts`, which calls
  `getDefaultData()`.
- On boot, `StoreProvider` fetches `/api/state` and only treats the response as AWS-console data
  when `state.data.ec2` exists.
- Loaded backend data is deep-merged onto the current defaults, so omitted keys fall back to the
  seeded mock account data.
- Frontend mutations are debounced for 300 ms and synced with `PUT /api/state` using the full
  `data` object.
- Normal AWS-console sync sends only `{ data }`. That means it does not preserve `meta` or `note`:
  each sync recreates `meta.created_at`, `meta.updated_at`, `meta.version`, and clears `note` to
  `null` unless a caller explicitly supplies them.
- `PATCH /api/state` performs a server-side deep merge, but the AWS console pages do not call it
  directly.
- `DELETE /api/state` resets the state to the seeded AWS dataset and deletes uploaded files for
  the current cookie-scoped user.

## State envelope (`UserState`)

- `meta.created_at` (string): Envelope creation timestamp.
- `meta.updated_at` (string): Envelope update timestamp.
- `meta.version` (number): Envelope version. In normal console usage this is usually reset by `PUT`
  rather than monotonically incremented.
- `meta.type` (string): Always `"unrestricted"`.
- `data` (object): AWS console state payload.
- `note` (string or null): Optional human note. Usually `null` during normal console usage.

## Top-level `data` keys seeded by default

`user`, `recentServices`, `favorites`, `ec2`, `volumes`, `snapshots`, `amis`, `elasticIps`,
`loadBalancers`, `targetGroups`, `autoScalingGroups`, `launchTemplates`, `securityGroups`,
`keyPairs`, `s3`, `lambda`, `lambdaLayers`, `rds`, `rdsSnapshots`, `rdsSubnetGroups`,
`rdsParameterGroups`, `iam`, `vpc`, `cloudwatch`, `dynamodb`, `sns`, `sqs`, `cloudfront`,
`route53`, `billing`, `notifications`, `flash`

## Default data shape

### Shell and account context

- `user`: `{ name, email, accountId, region, accountAlias, role }`
- `recentServices[]` (8): `{ id, name, path, lastVisited }`
- `favorites[]`: Array of service paths such as `"/ec2"`
- `notifications[]` (5): `{ id, title, message, type, timestamp, read, service }`
- `flash[]` (0 by default): Runtime toast queue, typically `{ id, timestamp, type, message }`

### EC2 and related compute resources

- `ec2[]` (5): Instances with id, name, type, state, public/private IPs, AZ, VPC/subnet, AMI
  refs, key pair, security groups, launch time, monitoring, IAM role, root device info, attached
  volume ids, and tags
- `volumes[]` (7): EBS-style volumes with size, type, state, IOPS/throughput, attachment info,
  encryption, and snapshot link
- `snapshots[]` (3): EC2 snapshots with status, progress, encryption, and owner
- `amis[]` (5): AMIs with owner, state, architecture, platform, virtualization, visibility, and
  creation time
- `elasticIps[]` (3): Allocation/association records with public/private IPs and network interface
  data
- `loadBalancers[]` (2): ALB/NLB records with ARN, scheme, DNS name, listeners, AZs, security
  groups, and tags
- `targetGroups[]` (2): Protocol/port/health-check config, registered targets, and linked load
  balancer
- `autoScalingGroups[]` (1): Capacity, launch template, AZs, target groups, instances, and
  scaling policies
- `launchTemplates[]` (2): AMI, instance type, key pair, security groups, user data, IAM instance
  profile, versions, and tags
- `securityGroups[]` (4): Inbound/outbound rule lists keyed by security group id
- `keyPairs[]` (3): `{ name, id, type, fingerprint, created }`

### Storage and serverless

- `s3[]` (5): Buckets with region, access, versioning, encryption, and nested `objects[]`
- `lambda[]` (4): Functions with runtime, handler, memory, timeout, code, environment, layers,
  role, tags, triggers, and invocation metrics
- `lambdaLayers[]` (2): Layer metadata with ARN, version, runtime, size, and creation time

### Databases

- `rds[]` (3): DB instances with engine, class, status, endpoint, port, AZ, Multi-AZ, storage,
  backup/maintenance windows, public accessibility, and tags
- `rdsSnapshots[]` (4): Snapshot id, source DB, engine, status, type, storage, encrypted flag,
  and creation time
- `rdsSubnetGroups[]` (2): Subnet group name, description, VPC, status, and subnet ids
- `rdsParameterGroups[]` (3): `{ name, family, description, type }`
- `dynamodb.tables[]` (3): Table name/status, key schema, capacity or billing mode, encryption,
  stream flag, tags, and `gsi`

### Identity, networking, and observability

- `iam.users[]` (5): User identity, groups, attached policies, MFA/password metadata, path, tags,
  and optional `accessKeys[]`
- `iam.roles[]` (4): Trust relationship, description, policies, path, and max session duration
- `iam.policies[]` (10): Managed/customer policy metadata
- `iam.groups[]` (4): Group membership and attached policies
- `iam.identityProviders[]` (1): OIDC/SAML-style provider info
- `iam.accountSettings`: `passwordPolicy` and `securityTokenService`
- `vpc.vpcs[]` (2): VPC id, CIDR, state, default/tenancy, DNS flags, and tags
- `vpc.subnets[]` (4): Subnet id, CIDR, AZ, available IPs, route table, and public/private type
- `vpc.routeTables[]` (2): Associations and route entries
- `vpc.internetGateways[]` (1): Attached/detached internet gateways
- `vpc.natGateways[]` (1): NAT gateway placement and IPs
- `vpc.networkAcls[]` (1): Inbound/outbound ACL rule lists
- `cloudwatch.alarms[]` (5): Metric alarm definitions and state
- `cloudwatch.logGroups[]` (8): Name, stored bytes, retention, creation time, and stream count
- `cloudwatch.dashboards[]` (3): Dashboard name, widgets, and last modified time
- `cloudwatch.metrics`: Seeded chart data, currently `CPUUtilization` and `NetworkIn`

### Messaging, CDN, DNS, and billing

- `sns.topics[]` (4) and `sns.subscriptions[]` (5)
- `sqs.queues[]` (4): Queue settings plus message counts
- `cloudfront.distributions[]` (2): Distribution id/domain/status, origins, cache behavior, price
  class, alternate names, last modified time, and tags
- `route53.hostedZones[]` (2) and `route53.records[]` (11)
- `billing.currentMonth`, `billing.forecast`, `billing.lastMonth`, `billing.currency`
- `billing.history[]` (6): Monthly spend points
- `billing.byService[]`: Cost breakdown used by dashboards/charts
- `billing.freeTier[]`: Usage versus free-tier limits
- `billing.bills[]` (4): Statement history
- `billing.budgets[]` (2): Seeded budgets. User-created budgets also add fields such as `id`,
  `forecasted`, `alertHistory`, and `created`
- `billing.paymentMethods[]` (1): Seeded card summary. User-created records also include `id` and
  `name`
- `billing.taxSettings`: Registration number, legal name, address, and tax exemption flag

## Optional or non-default keys used by the code

- `cloudtrail.events[]`: Read by `/cloudtrail` and `/cloudtrail/event-history`, but not seeded by
  `getDefaultData()`. Expected fields include `eventId`, `eventName`, `eventTime`, `userName`,
  `eventSource`, `sourceIp`, `region`, optional `resources[]`, and optional `requestParameters`.
- `uploads[]`, `examples`, or other arbitrary JSON keys can still be stored through the generic
  state APIs. They are not part of the AWS console's default dataset and are not used by the main
  AWS routes.

## Route-to-state mapping

- `/`: `user`, `recentServices`, `favorites`, `notifications`, `billing`
- `/ec2...`: `ec2`, `volumes`, `snapshots`, `amis`, `elasticIps`, `loadBalancers`,
  `targetGroups`, `autoScalingGroups`, `launchTemplates`, `securityGroups`, `keyPairs`
- `/s3...`: `s3`
- `/lambda...`: `lambda`, `lambdaLayers`
- `/rds...`: `rds`, `rdsSnapshots`, `rdsSubnetGroups`, `rdsParameterGroups`
- `/iam...`: `iam`
- `/billing...`: `billing`
- `/vpc...`: `vpc`
- `/cloudwatch...`: `cloudwatch`
- `/dynamodb...`: `dynamodb`
- `/sns`: `sns`
- `/sqs`: `sqs`
- `/cloudfront`: `cloudfront`
- `/route53`: `route53`
- `/cloudtrail...`: Optional `cloudtrail.events[]`
- `/go`: Derived debug view `{ initial_state, current_state, state_diff }`. This object is created
  at runtime and is not stored under `data`.
