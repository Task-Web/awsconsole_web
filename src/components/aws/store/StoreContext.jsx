import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { getDefaultData } from './dataManager';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

function deepDiff(initial, current, prefix = '') {
  const diff = {};
  if (initial === current) return diff;
  if (initial == null || current == null || typeof initial !== typeof current) {
    if (initial !== current) {
      diff[prefix || '_root'] = { old: initial, new: current };
    }
    return diff;
  }
  if (Array.isArray(initial) || Array.isArray(current)) {
    if (JSON.stringify(initial) !== JSON.stringify(current)) {
      diff[prefix || '_root'] = { old: initial, new: current };
    }
    return diff;
  }
  if (typeof initial === 'object') {
    const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const sub = deepDiff(initial[key], current[key], path);
      Object.assign(diff, sub);
    }
    return diff;
  }
  if (initial !== current) {
    diff[prefix || '_root'] = { old: initial, new: current };
  }
  return diff;
}

function reducer(prev, action) {
  const newState = { ...prev };

  switch (action.type) {
    // ========================
    // EC2 Instances
    // ========================
    case 'LAUNCH_INSTANCE':
      newState.ec2 = [...prev.ec2, action.payload];
      break;
    case 'TERMINATE_INSTANCE':
      newState.ec2 = prev.ec2.filter(i => i.id !== action.payload);
      break;
    case 'UPDATE_INSTANCE_TAGS':
      newState.ec2 = prev.ec2.map(i =>
        i.id === action.payload.id ? { ...i, tags: action.payload.tags } : i
      );
      break;
    case 'UPDATE_INSTANCE_STATE':
      newState.ec2 = prev.ec2.map(i =>
        i.id === action.payload.id
          ? { ...i, state: action.payload.state, ...(action.payload.publicIp !== undefined ? { publicIp: action.payload.publicIp } : {}) }
          : i
      );
      break;
    case 'UPDATE_INSTANCE':
      newState.ec2 = prev.ec2.map(i =>
        i.id === action.payload.id ? { ...i, ...action.payload } : i
      );
      break;

    // ========================
    // EC2 Volumes
    // ========================
    case 'CREATE_VOLUME':
      newState.volumes = [...prev.volumes, action.payload];
      break;
    case 'DELETE_VOLUME':
      newState.volumes = prev.volumes.filter(v => v.id !== action.payload);
      break;
    case 'ATTACH_VOLUME':
      newState.volumes = prev.volumes.map(v =>
        v.id === action.payload.volumeId ? { ...v, state: 'in-use', attachedTo: action.payload.instanceId, device: action.payload.device } : v
      );
      break;
    case 'DETACH_VOLUME':
      newState.volumes = prev.volumes.map(v =>
        v.id === action.payload ? { ...v, state: 'available', attachedTo: '', device: '' } : v
      );
      break;

    // ========================
    // EC2 Snapshots
    // ========================
    case 'CREATE_SNAPSHOT':
      newState.snapshots = [...prev.snapshots, action.payload];
      break;
    case 'DELETE_SNAPSHOT':
      newState.snapshots = prev.snapshots.filter(s => s.id !== action.payload);
      break;

    // ========================
    // EC2 Elastic IPs
    // ========================
    case 'ALLOCATE_EIP':
      newState.elasticIps = [...prev.elasticIps, action.payload];
      break;
    case 'RELEASE_EIP':
      newState.elasticIps = prev.elasticIps.filter(e => e.allocationId !== action.payload);
      break;
    case 'ASSOCIATE_EIP':
      newState.elasticIps = prev.elasticIps.map(e =>
        e.allocationId === action.payload.allocationId ? { ...e, ...action.payload } : e
      );
      break;
    case 'DISASSOCIATE_EIP':
      newState.elasticIps = prev.elasticIps.map(e =>
        e.allocationId === action.payload ? { ...e, associationId: '', instanceId: '', privateIp: '', networkInterfaceId: '' } : e
      );
      break;

    // ========================
    // EC2 Load Balancers
    // ========================
    case 'CREATE_LOAD_BALANCER':
      newState.loadBalancers = [...prev.loadBalancers, action.payload];
      break;
    case 'DELETE_LOAD_BALANCER':
      newState.loadBalancers = prev.loadBalancers.filter(lb => lb.name !== action.payload);
      break;

    // ========================
    // EC2 Target Groups
    // ========================
    case 'CREATE_TARGET_GROUP':
      newState.targetGroups = [...prev.targetGroups, action.payload];
      break;
    case 'DELETE_TARGET_GROUP':
      newState.targetGroups = prev.targetGroups.filter(tg => tg.name !== action.payload);
      break;
    case 'REGISTER_TARGET':
      newState.targetGroups = prev.targetGroups.map(tg =>
        tg.name === action.payload.groupName
          ? { ...tg, targets: [...tg.targets, action.payload.target] }
          : tg
      );
      break;
    case 'DEREGISTER_TARGET':
      newState.targetGroups = prev.targetGroups.map(tg =>
        tg.name === action.payload.groupName
          ? { ...tg, targets: tg.targets.filter(t => t.id !== action.payload.targetId) }
          : tg
      );
      break;

    // ========================
    // EC2 Auto Scaling Groups
    // ========================
    case 'CREATE_ASG':
      newState.autoScalingGroups = [...prev.autoScalingGroups, action.payload];
      break;
    case 'DELETE_ASG':
      newState.autoScalingGroups = prev.autoScalingGroups.filter(a => a.name !== action.payload);
      break;
    case 'UPDATE_ASG':
      newState.autoScalingGroups = prev.autoScalingGroups.map(a =>
        a.name === action.payload.name ? { ...a, ...action.payload } : a
      );
      break;

    // ========================
    // EC2 Launch Templates
    // ========================
    case 'CREATE_LAUNCH_TEMPLATE':
      newState.launchTemplates = [...prev.launchTemplates, action.payload];
      break;
    case 'DELETE_LAUNCH_TEMPLATE':
      newState.launchTemplates = prev.launchTemplates.filter(lt => lt.id !== action.payload);
      break;

    // ========================
    // EC2 Security Groups
    // ========================
    case 'CREATE_SECURITY_GROUP':
      newState.securityGroups = [...prev.securityGroups, action.payload];
      break;
    case 'DELETE_SECURITY_GROUP':
      newState.securityGroups = prev.securityGroups.filter(sg => sg.id !== action.payload);
      break;
    case 'UPDATE_SECURITY_GROUP':
      newState.securityGroups = prev.securityGroups.map(sg =>
        sg.id === action.payload.id ? { ...sg, ...action.payload } : sg
      );
      break;

    // ========================
    // EC2 Key Pairs
    // ========================
    case 'CREATE_KEY_PAIR':
      newState.keyPairs = [...prev.keyPairs, action.payload];
      break;
    case 'DELETE_KEY_PAIR':
      newState.keyPairs = prev.keyPairs.filter(kp => kp.name !== action.payload);
      break;
    case 'DELETE_AMI':
      newState.amis = (prev.amis || []).filter(a => a.id !== action.payload);
      break;

    // ========================
    // S3
    // ========================
    case 'CREATE_BUCKET':
      newState.s3 = [...prev.s3, action.payload];
      break;
    case 'DELETE_BUCKET':
      newState.s3 = prev.s3.filter(b => b.name !== action.payload);
      break;
    case 'UPLOAD_OBJECT':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: [...b.objects, action.payload.object] }
          : b
      );
      break;
    case 'DELETE_OBJECT':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: b.objects.filter(o => o.key !== action.payload.key) }
          : b
      );
      break;
    case 'CREATE_FOLDER':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: [...b.objects, { key: action.payload.folderKey, size: 0, lastModified: new Date().toISOString(), storageClass: "Standard", type: "folder" }] }
          : b
      );
      break;
    case 'UPDATE_BUCKET_VERSIONING':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, versioning: action.payload.versioning }
          : b
      );
      break;

    // ========================
    // Lambda
    // ========================
    case 'CREATE_FUNCTION':
      newState.lambda = [...prev.lambda, action.payload];
      break;
    case 'DELETE_FUNCTION':
      newState.lambda = prev.lambda.filter(f => f.name !== action.payload);
      break;
    case 'UPDATE_FUNCTION_CODE':
      newState.lambda = prev.lambda.map(f =>
        f.name === action.payload.name
          ? { ...f, code: action.payload.code, lastModified: new Date().toISOString() }
          : f
      );
      break;
    case 'UPDATE_FUNCTION_CONFIG':
      newState.lambda = prev.lambda.map(f =>
        f.name === action.payload.name ? { ...f, ...action.payload, lastModified: new Date().toISOString() } : f
      );
      break;
    case 'CREATE_LAMBDA_LAYER':
      newState.lambdaLayers = [...prev.lambdaLayers, action.payload];
      break;
    case 'DELETE_LAMBDA_LAYER':
      newState.lambdaLayers = prev.lambdaLayers.filter(l => l.name !== action.payload);
      break;

    // ========================
    // RDS
    // ========================
    case 'CREATE_DB':
      newState.rds = [...prev.rds, action.payload];
      break;
    case 'DELETE_DB':
      newState.rds = prev.rds.filter(db => db.id !== action.payload);
      break;
    case 'UPDATE_DB_STATUS':
      newState.rds = prev.rds.map(db =>
        db.id === action.payload.id
          ? { ...db, status: action.payload.status }
          : db
      );
      break;
    case 'UPDATE_DB':
      newState.rds = prev.rds.map(db =>
        db.id === action.payload.id ? { ...db, ...action.payload } : db
      );
      break;
    case 'CREATE_RDS_SNAPSHOT':
      newState.rdsSnapshots = [...prev.rdsSnapshots, action.payload];
      break;
    case 'DELETE_RDS_SNAPSHOT':
      newState.rdsSnapshots = prev.rdsSnapshots.filter(s => s.id !== action.payload);
      break;

    // ========================
    // IAM
    // ========================
    case 'CREATE_USER':
      newState.iam = { ...prev.iam, users: [...prev.iam.users, action.payload] };
      break;
    case 'DELETE_USER':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.filter(u => u.name !== action.payload),
        groups: prev.iam.groups.map(g => ({ ...g, users: g.users.filter(u => u !== action.payload) }))
      };
      break;
    case 'CREATE_ROLE':
      newState.iam = { ...prev.iam, roles: [...prev.iam.roles, action.payload] };
      break;
    case 'DELETE_ROLE':
      newState.iam = { ...prev.iam, roles: prev.iam.roles.filter(r => r.name !== action.payload) };
      break;
    case 'CREATE_GROUP':
      newState.iam = { ...prev.iam, groups: [...prev.iam.groups, action.payload] };
      break;
    case 'DELETE_GROUP':
      newState.iam = { ...prev.iam, groups: prev.iam.groups.filter(g => g.name !== action.payload) };
      break;
    case 'ADD_USER_TO_GROUP':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName ? { ...u, groups: [...new Set([...u.groups, action.payload.groupName])] } : u
        ),
        groups: prev.iam.groups.map(g =>
          g.name === action.payload.groupName ? { ...g, users: [...new Set([...g.users, action.payload.userName])] } : g
        )
      };
      break;
    case 'REMOVE_USER_FROM_GROUP':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName ? { ...u, groups: u.groups.filter(g => g !== action.payload.groupName) } : u
        ),
        groups: prev.iam.groups.map(g =>
          g.name === action.payload.groupName ? { ...g, users: g.users.filter(u => u !== action.payload.userName) } : g
        )
      };
      break;
    case 'CREATE_POLICY':
      newState.iam = { ...prev.iam, policies: [...prev.iam.policies, action.payload] };
      break;
    case 'DELETE_POLICY':
      newState.iam = { ...prev.iam, policies: prev.iam.policies.filter(p => p.arn !== action.payload) };
      break;

    // ========================
    // VPC
    // ========================
    case 'CREATE_VPC':
      newState.vpc = { ...prev.vpc, vpcs: [...prev.vpc.vpcs, action.payload] };
      break;
    case 'DELETE_VPC':
      newState.vpc = { ...prev.vpc, vpcs: prev.vpc.vpcs.filter(v => v.id !== action.payload) };
      break;
    case 'CREATE_SUBNET':
      newState.vpc = { ...prev.vpc, subnets: [...prev.vpc.subnets, action.payload] };
      break;
    case 'DELETE_SUBNET':
      newState.vpc = { ...prev.vpc, subnets: prev.vpc.subnets.filter(s => s.id !== action.payload) };
      break;
    case 'CREATE_ROUTE_TABLE':
      newState.vpc = { ...prev.vpc, routeTables: [...prev.vpc.routeTables, action.payload] };
      break;
    case 'DELETE_ROUTE_TABLE':
      newState.vpc = { ...prev.vpc, routeTables: prev.vpc.routeTables.filter(rt => rt.id !== action.payload) };
      break;
    case 'CREATE_IGW':
      newState.vpc = { ...prev.vpc, internetGateways: [...prev.vpc.internetGateways, action.payload] };
      break;
    case 'DELETE_IGW':
      newState.vpc = { ...prev.vpc, internetGateways: prev.vpc.internetGateways.filter(ig => ig.id !== action.payload) };
      break;
    case 'CREATE_NAT':
      newState.vpc = { ...prev.vpc, natGateways: [...prev.vpc.natGateways, action.payload] };
      break;
    case 'DELETE_NAT':
      newState.vpc = { ...prev.vpc, natGateways: prev.vpc.natGateways.filter(n => n.id !== action.payload) };
      break;

    // ========================
    // CloudWatch
    // ========================
    case 'CREATE_ALARM':
      newState.cloudwatch = { ...prev.cloudwatch, alarms: [...prev.cloudwatch.alarms, action.payload] };
      break;
    case 'DELETE_ALARM':
      newState.cloudwatch = { ...prev.cloudwatch, alarms: prev.cloudwatch.alarms.filter(a => a.name !== action.payload) };
      break;
    case 'UPDATE_ALARM_STATE':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        alarms: prev.cloudwatch.alarms.map(a =>
          a.name === action.payload.name ? { ...a, state: action.payload.state, updated: new Date().toISOString() } : a
        )
      };
      break;
    case 'CREATE_LOG_GROUP':
      newState.cloudwatch = { ...prev.cloudwatch, logGroups: [...prev.cloudwatch.logGroups, action.payload] };
      break;
    case 'DELETE_LOG_GROUP':
      newState.cloudwatch = { ...prev.cloudwatch, logGroups: prev.cloudwatch.logGroups.filter(lg => lg.name !== action.payload) };
      break;
    case 'CREATE_DASHBOARD':
      newState.cloudwatch = { ...prev.cloudwatch, dashboards: [...prev.cloudwatch.dashboards, action.payload] };
      break;
    case 'DELETE_DASHBOARD':
      newState.cloudwatch = { ...prev.cloudwatch, dashboards: prev.cloudwatch.dashboards.filter(d => d.name !== action.payload) };
      break;

    // ========================
    // DynamoDB
    // ========================
    case 'CREATE_DYNAMO_TABLE':
      newState.dynamodb = { ...prev.dynamodb, tables: [...prev.dynamodb.tables, action.payload] };
      break;
    case 'DELETE_DYNAMO_TABLE':
      newState.dynamodb = { ...prev.dynamodb, tables: prev.dynamodb.tables.filter(t => t.name !== action.payload) };
      break;
    case 'UPDATE_DYNAMO_TABLE':
      newState.dynamodb = {
        ...prev.dynamodb,
        tables: prev.dynamodb.tables.map(t => t.name === action.payload.name ? { ...t, ...action.payload } : t)
      };
      break;

    // ========================
    // SNS
    // ========================
    case 'CREATE_TOPIC':
      newState.sns = { ...prev.sns, topics: [...prev.sns.topics, action.payload] };
      break;
    case 'DELETE_TOPIC':
      newState.sns = {
        ...prev.sns,
        topics: prev.sns.topics.filter(t => t.arn !== action.payload),
        subscriptions: prev.sns.subscriptions.filter(s => s.topicArn !== action.payload)
      };
      break;
    case 'CREATE_SUBSCRIPTION':
      newState.sns = {
        ...prev.sns,
        subscriptions: [...prev.sns.subscriptions, action.payload],
        topics: prev.sns.topics.map(t =>
          t.arn === action.payload.topicArn ? { ...t, subscriptions: t.subscriptions + 1 } : t
        )
      };
      break;
    case 'DELETE_SUBSCRIPTION': {
      const delSub = typeof action.payload === 'string' ? action.payload : action.payload.arn;
      const subToDelete = prev.sns.subscriptions.find(s => s.id === delSub || s.arn === delSub);
      const subTopicArn = subToDelete?.topicArn || (typeof action.payload === 'object' ? action.payload.topicArn : null);
      newState.sns = {
        ...prev.sns,
        subscriptions: prev.sns.subscriptions.filter(s => s.id !== delSub && s.arn !== delSub),
        topics: subTopicArn ? prev.sns.topics.map(t =>
          t.arn === subTopicArn ? { ...t, subscriptions: Math.max(0, t.subscriptions - 1) } : t
        ) : prev.sns.topics
      };
      break;
    }

    // ========================
    // SQS
    // ========================
    case 'CREATE_QUEUE':
      newState.sqs = { ...prev.sqs, queues: [...prev.sqs.queues, action.payload] };
      break;
    case 'DELETE_QUEUE':
      newState.sqs = { ...prev.sqs, queues: prev.sqs.queues.filter(q => q.name !== action.payload) };
      break;
    case 'PURGE_QUEUE':
      newState.sqs = {
        ...prev.sqs,
        queues: prev.sqs.queues.map(q => q.name === action.payload ? { ...q, messagesAvailable: 0, messagesInFlight: 0 } : q)
      };
      break;
    case 'SEND_MESSAGE': {
      const qName = typeof action.payload === 'string' ? action.payload : action.payload.queueName;
      newState.sqs = {
        ...prev.sqs,
        queues: prev.sqs.queues.map(q => q.name === qName ? { ...q, messagesAvailable: q.messagesAvailable + 1 } : q)
      };
      break;
    }

    // ========================
    // CloudFront
    // ========================
    case 'CREATE_DISTRIBUTION':
      newState.cloudfront = { ...prev.cloudfront, distributions: [...prev.cloudfront.distributions, action.payload] };
      break;
    case 'DELETE_DISTRIBUTION':
      newState.cloudfront = { ...prev.cloudfront, distributions: prev.cloudfront.distributions.filter(d => d.id !== action.payload) };
      break;
    case 'UPDATE_DISTRIBUTION':
      newState.cloudfront = {
        ...prev.cloudfront,
        distributions: prev.cloudfront.distributions.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d)
      };
      break;

    // ========================
    // Route 53
    // ========================
    case 'CREATE_HOSTED_ZONE':
      newState.route53 = { ...prev.route53, hostedZones: [...prev.route53.hostedZones, action.payload] };
      break;
    case 'DELETE_HOSTED_ZONE':
      newState.route53 = {
        ...prev.route53,
        hostedZones: prev.route53.hostedZones.filter(z => z.id !== action.payload),
        records: prev.route53.records.filter(r => r.zoneId !== action.payload)
      };
      break;
    case 'CREATE_RECORD':
      newState.route53 = { ...prev.route53, records: [...prev.route53.records, action.payload] };
      break;
    case 'DELETE_RECORD': {
      const delRec = action.payload;
      newState.route53 = {
        ...prev.route53,
        records: prev.route53.records.filter(r => {
          if (typeof delRec === 'string') return r.id !== delRec;
          return !(r.zoneId === delRec.zoneId && r.name === delRec.name && r.type === delRec.type);
        })
      };
      break;
    }

    // ========================
    // IAM Identity Providers
    // ========================
    case 'CREATE_IDENTITY_PROVIDER':
      newState.iam = { ...prev.iam, identityProviders: [...(prev.iam.identityProviders || []), action.payload] };
      break;
    case 'DELETE_IDENTITY_PROVIDER':
      newState.iam = { ...prev.iam, identityProviders: (prev.iam.identityProviders || []).filter(p => p.arn !== action.payload) };
      break;

    // ========================
    // IAM Access Keys
    // ========================
    case 'DEACTIVATE_ACCESS_KEY':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? { ...u, accessKeys: (u.accessKeys || []).map(k =>
                k.accessKeyId === action.payload.accessKeyId ? { ...k, status: 'Inactive' } : k
              ) }
            : u
        )
      };
      break;
    case 'DELETE_ACCESS_KEY':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? { ...u, accessKeys: (u.accessKeys || []).filter(k =>
                k.accessKeyId !== action.payload.accessKeyId
              ) }
            : u
        )
      };
      break;

    // ========================
    // User / Role
    // ========================
    case 'SWITCH_ROLE':
      newState.user = { ...prev.user, role: action.payload };
      break;

    // ========================
    // Billing
    // ========================
    case 'ADD_PAYMENT_METHOD':
      newState.billing = { ...prev.billing, paymentMethods: [...(prev.billing?.paymentMethods || []), action.payload] };
      break;
    case 'REMOVE_PAYMENT_METHOD':
      newState.billing = { ...prev.billing, paymentMethods: (prev.billing?.paymentMethods || []).filter(m => m.id !== action.payload) };
      break;
    case 'CREATE_BUDGET':
      newState.billing = { ...prev.billing, budgets: [...(prev.billing?.budgets || []), action.payload] };
      break;
    case 'DELETE_BUDGET':
      newState.billing = { ...prev.billing, budgets: (prev.billing?.budgets || []).filter(b => b.id !== action.payload) };
      break;

    // ========================
    // RDS Snapshots (status)
    // ========================
    case 'UPDATE_RDS_SNAPSHOT_STATUS':
      newState.rdsSnapshots = prev.rdsSnapshots.map(s =>
        s.id === action.payload.id ? { ...s, status: action.payload.status } : s
      );
      break;

    // ========================
    // Shared
    // ========================
    case 'SET_REGION':
      newState.user = { ...prev.user, region: action.payload };
      break;
    case 'MARK_NOTIFICATION_READ':
      newState.notifications = prev.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      break;
    case 'DISMISS_NOTIFICATION':
      newState.notifications = prev.notifications.filter(n => n.id !== action.payload);
      break;
    case 'ADD_NOTIFICATION': {
      const notif = { id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), read: false, ...action.payload };
      newState.notifications = [notif, ...prev.notifications];
      break;
    }
    case 'TOGGLE_FAVORITE': {
      const favs = prev.favorites || [];
      const idx = favs.indexOf(action.payload);
      newState.favorites = idx >= 0 ? favs.filter(f => f !== action.payload) : [...favs, action.payload];
      break;
    }
    case 'ADD_RECENT_SERVICE': {
      const existing = prev.recentServices.filter(s => s.id !== action.payload.id);
      newState.recentServices = [{ ...action.payload, lastVisited: new Date().toISOString() }, ...existing].slice(0, 10);
      break;
    }
    case 'ADD_FLASH': {
      const flash = { id: `flash-${Date.now()}`, timestamp: Date.now(), ...action.payload };
      newState.flash = [...(prev.flash || []), flash];
      break;
    }
    case 'DISMISS_FLASH':
      newState.flash = (prev.flash || []).filter(f => f.id !== action.payload);
      break;
    // ========================
    // Bulk state setters (for real Docker sync)
    // ========================
    case 'SET_EC2_INSTANCES':
      newState.ec2 = action.payload;
      break;
    case 'SET_AMIS':
      newState.amis = action.payload;
      break;
    case 'SET_KEY_PAIRS':
      newState.keyPairs = action.payload;
      break;

    default:
      return prev;
  }
  return newState;
}

// Sync state to backend API
async function syncToBackend(state) {
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ data: state }),
    });
  } catch (e) {
    console.error('Failed to sync state to backend:', e);
  }
}

// Fetch state from backend API
async function fetchFromBackend() {
  try {
    const res = await fetch('/api/state', {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      // If the backend has AWS state data, use it
      if (data.state && data.state.data && data.state.data.ec2) {
        return data.state.data;
      }
    }
  } catch (e) {
    console.log('No backend state available, using defaults');
  }
  return null;
}

function deepMergeWithDefaults(defaults, custom) {
  if (!custom) return defaults;
  const result = { ...defaults };
  for (const key in custom) {
    if (custom[key] !== null && custom[key] !== undefined) {
      if (typeof custom[key] === 'object' && !Array.isArray(custom[key]) && typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
        result[key] = deepMergeWithDefaults(defaults[key], custom[key]);
      } else {
        result[key] = custom[key];
      }
    }
  }
  return result;
}

export const StoreProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const [initialStateData, setInitialStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);
  const syncTimeout = useRef(null);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Fetch state from backend, fall back to defaults
    fetchFromBackend().then(backendState => {
      const defaults = getDefaultData();
      const data = backendState ? deepMergeWithDefaults(defaults, backendState) : defaults;
      const initialClone = JSON.parse(JSON.stringify(data));
      setState(data);
      setInitialStateData(initialClone);
      setLoading(false);

      // If no backend state existed, push defaults
      if (!backendState) {
        syncToBackend(data);
      }
    });
  }, []);

  // Debounced sync to backend on state changes
  useEffect(() => {
    if (!loading && state) {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(() => {
        syncToBackend(state);
      }, 300);
    }
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [state, loading]);

  const dispatch = useCallback((action) => {
    setState(prev => reducer(prev, action));
  }, []);

  const addFlash = useCallback((type, message) => {
    dispatch({ type: 'ADD_FLASH', payload: { type, message } });
  }, [dispatch]);

  const getDebugState = useCallback(() => {
    const initial = initialStateData || getDefaultData();
    const current = state;
    const stateDiff = deepDiff(initial, current);
    return { initial_state: initial, current_state: current, state_diff: stateDiff };
  }, [state, initialStateData]);

  if (loading || !state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: '"Amazon Ember", "Helvetica Neue", -apple-system, sans-serif', color: '#545B64' }}>
        Loading AWS Console...
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ state, dispatch, getDebugState, addFlash }}>
      {children}
    </StoreContext.Provider>
  );
};
