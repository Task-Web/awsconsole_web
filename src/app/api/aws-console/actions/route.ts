import { NextRequest } from "next/server";
import { createResponseWithCookie, getUserId } from "@/lib/cookies";
import { stateStore } from "@/lib/state-store";
import { reduceAwsState } from "@/lib/aws-domain";
import { awsProductKeys, projectAwsState } from "@/lib/aws-projection";
import { getDefaultData } from "@/components/aws/store/dataManager";

const ACTIONS = new Set(`
  LAUNCH_INSTANCE TERMINATE_INSTANCE UPDATE_INSTANCE_TAGS UPDATE_INSTANCE_STATE UPDATE_INSTANCE
  CREATE_VOLUME DELETE_VOLUME ATTACH_VOLUME DETACH_VOLUME CREATE_SNAPSHOT DELETE_SNAPSHOT
  ALLOCATE_EIP RELEASE_EIP ASSOCIATE_EIP DISASSOCIATE_EIP CREATE_LOAD_BALANCER DELETE_LOAD_BALANCER
  CREATE_TARGET_GROUP DELETE_TARGET_GROUP REGISTER_TARGET DEREGISTER_TARGET CREATE_ASG DELETE_ASG UPDATE_ASG
  CREATE_LAUNCH_TEMPLATE DELETE_LAUNCH_TEMPLATE CREATE_SECURITY_GROUP DELETE_SECURITY_GROUP UPDATE_SECURITY_GROUP
  CREATE_KEY_PAIR DELETE_KEY_PAIR DELETE_AMI CREATE_BUCKET DELETE_BUCKET UPLOAD_OBJECT DELETE_OBJECT CREATE_FOLDER
  UPDATE_BUCKET_VERSIONING CREATE_FUNCTION DELETE_FUNCTION UPDATE_FUNCTION_CODE UPDATE_FUNCTION_CONFIG
  CREATE_LAMBDA_LAYER DELETE_LAMBDA_LAYER CREATE_DB DELETE_DB UPDATE_DB_STATUS UPDATE_DB CREATE_RDS_SNAPSHOT
  DELETE_RDS_SNAPSHOT CREATE_USER DELETE_USER CREATE_ROLE DELETE_ROLE CREATE_GROUP DELETE_GROUP ADD_USER_TO_GROUP
  REMOVE_USER_FROM_GROUP CREATE_POLICY DELETE_POLICY CREATE_VPC DELETE_VPC CREATE_SUBNET DELETE_SUBNET
  CREATE_ROUTE_TABLE DELETE_ROUTE_TABLE CREATE_IGW DELETE_IGW CREATE_NAT DELETE_NAT CREATE_ALARM DELETE_ALARM
  UPDATE_ALARM_STATE CREATE_LOG_GROUP DELETE_LOG_GROUP CREATE_DASHBOARD DELETE_DASHBOARD CREATE_DYNAMO_TABLE
  DELETE_DYNAMO_TABLE UPDATE_DYNAMO_TABLE CREATE_TOPIC DELETE_TOPIC CREATE_SUBSCRIPTION DELETE_SUBSCRIPTION
  CREATE_QUEUE DELETE_QUEUE PURGE_QUEUE SEND_MESSAGE CREATE_DISTRIBUTION DELETE_DISTRIBUTION UPDATE_DISTRIBUTION
  CREATE_HOSTED_ZONE DELETE_HOSTED_ZONE CREATE_RECORD DELETE_RECORD CREATE_IDENTITY_PROVIDER DELETE_IDENTITY_PROVIDER
  DEACTIVATE_ACCESS_KEY DELETE_ACCESS_KEY SWITCH_ROLE ADD_PAYMENT_METHOD REMOVE_PAYMENT_METHOD CREATE_BUDGET
  DELETE_BUDGET UPDATE_RDS_SNAPSHOT_STATUS SET_REGION MARK_NOTIFICATION_READ DISMISS_NOTIFICATION ADD_NOTIFICATION
  TOGGLE_FAVORITE ADD_RECENT_SERVICE ADD_FLASH DISMISS_FLASH
`.trim().split(/\s+/));

const FORBIDDEN_FIELDS = new Set([
  "developer_tools_open", "evaluator_marker", "evaluator", "internal", "meta", "note", "uploads",
]);

const defaults = getDefaultData() as Record<string, unknown>;

function at(path: string): unknown {
  let value: unknown = defaults;
  for (const key of path.split(".")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function keysAt(path: string) {
  const value = at(path);
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

type CreateResource = { path: string; identity: string; required: string[]; extra?: string[] };
const CREATE_RESOURCES: Record<string, CreateResource> = {
  LAUNCH_INSTANCE: { path: "ec2", identity: "id", required: ["id", "name", "type", "state", "ami"] },
  CREATE_VOLUME: { path: "volumes", identity: "id", required: ["id", "name", "size", "volumeType", "state"] },
  CREATE_SNAPSHOT: { path: "snapshots", identity: "id", required: ["id", "volumeId", "status"] },
  ALLOCATE_EIP: { path: "elasticIps", identity: "allocationId", required: ["allocationId", "publicIp"] },
  CREATE_LOAD_BALANCER: { path: "loadBalancers", identity: "name", required: ["name", "type", "state", "vpcId"] },
  CREATE_TARGET_GROUP: { path: "targetGroups", identity: "name", required: ["name", "protocol", "port", "vpcId"] },
  CREATE_ASG: { path: "autoScalingGroups", identity: "name", required: ["name", "minSize", "maxSize", "desiredCapacity", "launchTemplate"] },
  CREATE_LAUNCH_TEMPLATE: { path: "launchTemplates", identity: "id", required: ["id", "name", "ami", "instanceType"] },
  CREATE_SECURITY_GROUP: { path: "securityGroups", identity: "id", required: ["id", "name", "vpcId", "inboundRules", "outboundRules"], extra: ["ownerId"] },
  CREATE_KEY_PAIR: { path: "keyPairs", identity: "name", required: ["name", "id", "type", "fingerprint"] },
  CREATE_BUCKET: { path: "s3", identity: "name", required: ["name", "region", "objects"] },
  CREATE_FUNCTION: { path: "lambda", identity: "name", required: ["name", "runtime", "handler", "code"] },
  CREATE_LAMBDA_LAYER: { path: "lambdaLayers", identity: "name", required: ["name", "arn", "version", "runtime"] },
  CREATE_DB: { path: "rds", identity: "id", required: ["id", "engine", "status", "class"] },
  CREATE_RDS_SNAPSHOT: { path: "rdsSnapshots", identity: "id", required: ["id", "dbInstance", "engine", "status"], extra: ["dbInstance", "engineVersion", "type", "size"] },
  CREATE_USER: { path: "iam.users", identity: "name", required: ["name", "arn", "groups", "policies"] },
  CREATE_ROLE: { path: "iam.roles", identity: "name", required: ["name", "arn"] },
  CREATE_GROUP: { path: "iam.groups", identity: "name", required: ["name", "arn"] },
  CREATE_POLICY: { path: "iam.policies", identity: "arn", required: ["name", "arn", "type", "document"], extra: ["document"] },
  CREATE_VPC: { path: "vpc.vpcs", identity: "id", required: ["id", "name", "cidr", "state"] },
  CREATE_SUBNET: { path: "vpc.subnets", identity: "id", required: ["id", "vpcId", "cidr", "az"] },
  CREATE_ROUTE_TABLE: { path: "vpc.routeTables", identity: "id", required: ["id", "vpcId", "routes"] },
  CREATE_IGW: { path: "vpc.internetGateways", identity: "id", required: ["id", "state", "vpcId"] },
  CREATE_NAT: { path: "vpc.natGateways", identity: "id", required: ["id", "state", "subnetId"] },
  CREATE_ALARM: { path: "cloudwatch.alarms", identity: "name", required: ["name", "metric", "state", "threshold", "comparison"], extra: ["comparison"] },
  CREATE_LOG_GROUP: { path: "cloudwatch.logGroups", identity: "name", required: ["name", "retentionDays"] },
  CREATE_DASHBOARD: { path: "cloudwatch.dashboards", identity: "name", required: ["name", "widgets"] },
  CREATE_DYNAMO_TABLE: { path: "dynamodb.tables", identity: "name", required: ["name", "status", "partitionKey", "billingMode"] },
  CREATE_TOPIC: { path: "sns.topics", identity: "arn", required: ["name", "arn", "type"], extra: ["subscriptionsCount"] },
  CREATE_SUBSCRIPTION: { path: "sns.subscriptions", identity: "id", required: ["id", "topicArn", "protocol", "endpoint"], extra: ["id", "created"] },
  CREATE_QUEUE: { path: "sqs.queues", identity: "name", required: ["name", "url", "type"] },
  CREATE_DISTRIBUTION: { path: "cloudfront.distributions", identity: "id", required: ["id", "domainName", "origins", "state"], extra: ["viewerProtocolPolicy"] },
  CREATE_HOSTED_ZONE: { path: "route53.hostedZones", identity: "id", required: ["id", "name", "type"], extra: ["vpc"] },
  CREATE_RECORD: { path: "route53.records", identity: "id", required: ["id", "zoneId", "name", "type", "value"] },
  CREATE_IDENTITY_PROVIDER: { path: "iam.identityProviders", identity: "arn", required: ["name", "type", "arn", "url"], extra: ["url"] },
  ADD_PAYMENT_METHOD: { path: "billing.paymentMethods", identity: "id", required: ["id", "type", "last4", "brand"], extra: ["id", "name"] },
  CREATE_BUDGET: { path: "billing.budgets", identity: "id", required: ["id", "name", "type", "limit"], extra: ["id", "forecasted", "alertHistory", "created"] },
};

const STRING_ACTIONS = new Set(`
  TERMINATE_INSTANCE DELETE_VOLUME DETACH_VOLUME DELETE_SNAPSHOT RELEASE_EIP DISASSOCIATE_EIP
  DELETE_LOAD_BALANCER DELETE_TARGET_GROUP DELETE_ASG DELETE_LAUNCH_TEMPLATE DELETE_SECURITY_GROUP
  DELETE_KEY_PAIR DELETE_AMI DELETE_BUCKET DELETE_FUNCTION DELETE_LAMBDA_LAYER DELETE_DB DELETE_RDS_SNAPSHOT
  DELETE_USER DELETE_ROLE DELETE_GROUP DELETE_POLICY DELETE_VPC DELETE_SUBNET DELETE_ROUTE_TABLE DELETE_IGW
  DELETE_NAT DELETE_ALARM DELETE_LOG_GROUP DELETE_DASHBOARD DELETE_DYNAMO_TABLE DELETE_TOPIC DELETE_SUBSCRIPTION
  DELETE_QUEUE PURGE_QUEUE DELETE_DISTRIBUTION DELETE_HOSTED_ZONE DELETE_RECORD DELETE_IDENTITY_PROVIDER
  REMOVE_PAYMENT_METHOD DELETE_BUDGET SET_REGION MARK_NOTIFICATION_READ DISMISS_NOTIFICATION SWITCH_ROLE
  TOGGLE_FAVORITE DISMISS_FLASH
`.trim().split(/\s+/));

const OBJECT_ACTIONS: Record<string, { fields: string[]; required: string[] }> = {
  UPDATE_INSTANCE_TAGS: { fields: ["id", "tags"], required: ["id", "tags"] },
  UPDATE_INSTANCE_STATE: { fields: ["id", "state", "publicIp"], required: ["id", "state"] },
  UPDATE_INSTANCE: { fields: keysAt("ec2.0"), required: ["id"] },
  ATTACH_VOLUME: { fields: ["volumeId", "instanceId", "device"], required: ["volumeId", "instanceId", "device"] },
  ASSOCIATE_EIP: { fields: ["allocationId", "associationId", "instanceId", "privateIp", "networkInterfaceId"], required: ["allocationId", "instanceId"] },
  REGISTER_TARGET: { fields: ["groupName", "target"], required: ["groupName", "target"] },
  DEREGISTER_TARGET: { fields: ["groupName", "targetId"], required: ["groupName", "targetId"] },
  UPDATE_ASG: { fields: ["name", "minSize", "maxSize", "desiredCapacity"], required: ["name", "minSize", "maxSize", "desiredCapacity"] },
  UPDATE_SECURITY_GROUP: { fields: keysAt("securityGroups.0"), required: ["id"] },
  UPLOAD_OBJECT: { fields: ["bucketName", "object"], required: ["bucketName", "object"] },
  DELETE_OBJECT: { fields: ["bucketName", "key"], required: ["bucketName", "key"] },
  CREATE_FOLDER: { fields: ["bucketName", "folderKey"], required: ["bucketName", "folderKey"] },
  UPDATE_BUCKET_VERSIONING: { fields: ["bucketName", "versioning"], required: ["bucketName", "versioning"] },
  UPDATE_FUNCTION_CODE: { fields: ["name", "code"], required: ["name", "code"] },
  UPDATE_FUNCTION_CONFIG: { fields: keysAt("lambda.0"), required: ["name"] },
  UPDATE_DB_STATUS: { fields: ["id", "status"], required: ["id", "status"] },
  UPDATE_DB: { fields: keysAt("rds.0"), required: ["id"] },
  ADD_USER_TO_GROUP: { fields: ["userName", "groupName"], required: ["userName", "groupName"] },
  REMOVE_USER_FROM_GROUP: { fields: ["userName", "groupName"], required: ["userName", "groupName"] },
  UPDATE_ALARM_STATE: { fields: ["name", "state"], required: ["name", "state"] },
  UPDATE_DYNAMO_TABLE: { fields: keysAt("dynamodb.tables.0"), required: ["name"] },
  SEND_MESSAGE: { fields: ["queueName", "body"], required: ["queueName", "body"] },
  UPDATE_DISTRIBUTION: { fields: [...keysAt("cloudfront.distributions.0"), "viewerProtocolPolicy"], required: ["id"] },
  DEACTIVATE_ACCESS_KEY: { fields: ["userName", "accessKeyId"], required: ["userName", "accessKeyId"] },
  DELETE_ACCESS_KEY: { fields: ["userName", "accessKeyId"], required: ["userName", "accessKeyId"] },
  UPDATE_RDS_SNAPSHOT_STATUS: { fields: ["id", "status"], required: ["id", "status"] },
  ADD_NOTIFICATION: { fields: ["title", "message", "type", "service"], required: ["title", "message", "type", "service"] },
  ADD_RECENT_SERVICE: { fields: ["id", "name", "path"], required: ["id", "name", "path"] },
  ADD_FLASH: { fields: ["type", "message"], required: ["type", "message"] },
};

function safeValue(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || ["boolean", "number"].includes(typeof value)) return true;
  if (typeof value === "string") return value.length <= 2_000_000;
  if (Array.isArray(value)) return value.length <= 1000 && value.every((item) => safeValue(item, depth + 1));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([key, nested]) => !FORBIDDEN_FIELDS.has(key) && safeValue(nested, depth + 1)
  );
}

function exactObject(value: unknown, fields: string[], required: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).every((key) => fields.includes(key) && !FORBIDDEN_FIELDS.has(key)) &&
    required.every((key) => Object.prototype.hasOwnProperty.call(record, key)) && safeValue(record);
}

function sameShape(value: unknown, example: unknown) {
  if (example === null || example === undefined) return true;
  if (Array.isArray(example)) return Array.isArray(value);
  if (typeof example === "object") return !!value && typeof value === "object" && !Array.isArray(value);
  return typeof value === typeof example;
}

function validPayload(action: string, value: unknown): boolean {
  if (STRING_ACTIONS.has(action)) return typeof value === "string" && value.trim().length > 0 && value.length <= 2048;
  const resource = CREATE_RESOURCES[action];
  if (resource) {
    const example = at(`${resource.path}.0`);
    const fields = [...new Set([...keysAt(`${resource.path}.0`), ...(resource.extra || [])])];
    return exactObject(value, fields, resource.required) &&
      typeof (value as Record<string, unknown>)[resource.identity] === "string" &&
      ((value as Record<string, string>)[resource.identity]).trim().length > 0 &&
      (!example || typeof example !== "object" || Object.entries(value as Record<string, unknown>).every(
        ([key, item]) => !(key in (example as Record<string, unknown>)) || sameShape(item, (example as Record<string, unknown>)[key])
      ));
  }
  const schema = OBJECT_ACTIONS[action];
  if (!schema || !exactObject(value, schema.fields, schema.required)) return false;
  const record = value as Record<string, unknown>;
  const structuredFields = new Set(["tags", "target", "object"]);
  if (schema.required.some((key) => !structuredFields.has(key) &&
      !["minSize", "maxSize", "desiredCapacity"].includes(key) &&
      (typeof record[key] !== "string" || !(record[key] as string).trim()))) return false;
  if (action === "UPDATE_INSTANCE_TAGS" && (!Array.isArray(record.tags) || record.tags.some((tag) =>
      !exactObject(tag, ["Key", "Value"], ["Key", "Value"]) ||
      typeof (tag as Record<string, unknown>).Key !== "string" ||
      typeof (tag as Record<string, unknown>).Value !== "string"))) return false;
  if (action === "UPDATE_INSTANCE_STATE" && record.publicIp !== undefined && typeof record.publicIp !== "string") return false;
  if (action === "REGISTER_TARGET") {
    if (!record.target || typeof record.target !== "object" ||
        !exactObject(record.target, ["id", "port", "health"], ["id", "port", "health"])) return false;
    const target = record.target as Record<string, unknown>;
    if (typeof target.id !== "string" || typeof target.health !== "string" ||
        typeof target.port !== "number" || !Number.isFinite(target.port)) return false;
  }
  if (action === "UPLOAD_OBJECT") {
    if (!record.object || typeof record.object !== "object" ||
        !exactObject(record.object, ["key", "size", "lastModified", "storageClass", "type"],
          ["key", "size", "lastModified", "storageClass", "type"])) return false;
    const object = record.object as Record<string, unknown>;
    if ([object.key, object.lastModified, object.storageClass, object.type].some((item) => typeof item !== "string") ||
        typeof object.size !== "number" || !Number.isFinite(object.size)) return false;
  }
  if (action === "UPDATE_ASG" && [record.minSize, record.maxSize, record.desiredCapacity].some(
      (item) => typeof item !== "number" || !Number.isFinite(item))) return false;
  return true;
}

function bad(detail: string, userId: string, status = 400) {
  return createResponseWithCookie({ detail }, userId, status);
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body", userId);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Request body must be an object", userId);
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "type" && key !== "payload") ||
      typeof input.type !== "string" || !ACTIONS.has(input.type) ||
      !Object.prototype.hasOwnProperty.call(input, "payload") || !validPayload(input.type, input.payload)) {
    return bad("Invalid AWS console action", userId);
  }
  if (input.type === "UPDATE_INSTANCE_STATE") {
    const payload = input.payload as Record<string, unknown>;
    if (!["pending", "running", "stopping", "stopped", "shutting-down", "terminated"].includes(payload.state as string)) {
      return bad("Illegal instance state transition", userId);
    }
  }

  const current = await stateStore.getState(userId);
  const consoleState = projectAwsState(current.data);
  if (input.type === "UPDATE_INSTANCE_STATE") {
    const payload = input.payload as Record<string, string>;
    const instance = consoleState.ec2.find((item: { id?: string; state?: string }) => item.id === payload.id);
    if (!instance) return bad("Instance not found", userId, 404);
    const allowed: Record<string, string[]> = {
      pending: ["running", "terminated"], running: ["pending", "stopping", "shutting-down"],
      stopping: ["stopped"], stopped: ["pending", "shutting-down"], "shutting-down": ["terminated"], terminated: [],
    };
    if (!instance.state || !allowed[instance.state]?.includes(payload.state)) return bad("Illegal instance state transition", userId, 409);
  }
  const next = reduceAwsState(consoleState, structuredClone(input));
  const changed = awsProductKeys().some(
    (key) => JSON.stringify(consoleState[key]) !== JSON.stringify(next[key])
  );
  if (!changed) return bad("Action target not found or action had no effect", userId, 404);
  const productState = Object.fromEntries(awsProductKeys().map((key) => [key, next[key]]));
  await stateStore.patchState(userId, productState, `AWS console action: ${input.type}`);
  return createResponseWithCookie({ user_id: userId, console: next }, userId);
}
