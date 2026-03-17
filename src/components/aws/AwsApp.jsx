'use client';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext.jsx';
import Layout from './Layout';
import Placeholder from './pages/Placeholder';

// Core
import Dashboard from './pages/Dashboard';
import StateInspector from './pages/StateInspector';

// EC2
import EC2 from './pages/EC2';
import EC2Dashboard from './pages/EC2Dashboard';
import EC2InstanceDetail from './pages/EC2InstanceDetail';
import EC2InstanceTypes from './pages/EC2InstanceTypes';
import EC2SecurityGroups from './pages/EC2SecurityGroups';
import EC2KeyPairs from './pages/EC2KeyPairs';
import EC2Volumes from './pages/EC2Volumes';
import EC2Snapshots from './pages/EC2Snapshots';
import EC2AMIs from './pages/EC2AMIs';
import EC2ElasticIPs from './pages/EC2ElasticIPs';
import EC2LoadBalancers from './pages/EC2LoadBalancers';
import EC2TargetGroups from './pages/EC2TargetGroups';
import EC2AutoScaling from './pages/EC2AutoScaling';
import EC2LaunchTemplates from './pages/EC2LaunchTemplates';

// S3
import S3Buckets from './pages/S3Buckets';
import S3BucketDetail from './pages/S3BucketDetail';

// Lambda
import LambdaFunctions from './pages/LambdaFunctions';
import LambdaFunctionDetail from './pages/LambdaFunctionDetail';
import LambdaDashboard from './pages/LambdaDashboard';
import LambdaLayers from './pages/LambdaLayers';

// RDS
import RDS from './pages/RDS';
import RDSDetail from './pages/RDSDetail';
import RDSDashboard from './pages/RDSDashboard';
import RDSSnapshots from './pages/RDSSnapshots';
import RDSSubnetGroups from './pages/RDSSubnetGroups';
import RDSParameterGroups from './pages/RDSParameterGroups';

// IAM
import IAMDashboard from './pages/IAMDashboard';
import IAMUsers from './pages/IAMUsers';
import IAMGroups from './pages/IAMGroups';
import IAMRoles from './pages/IAMRoles';
import IAMPolicies from './pages/IAMPolicies';
import IAMIdentityProviders from './pages/IAMIdentityProviders';
import IAMAccountSettings from './pages/IAMAccountSettings';

// Billing
import BillingDashboard from './pages/BillingDashboard';
import CostExplorer from './pages/CostExplorer';
import BillingBills from './pages/BillingBills';
import BillingBudgets from './pages/BillingBudgets';
import BillingPaymentMethods from './pages/BillingPaymentMethods';
import BillingTaxSettings from './pages/BillingTaxSettings';

// VPC
import VPCDashboard from './pages/VPCDashboard';
import VPCList from './pages/VPCList';
import VPCSubnets from './pages/VPCSubnets';
import VPCRouteTables from './pages/VPCRouteTables';
import VPCInternetGateways from './pages/VPCInternetGateways';
import VPCNATGateways from './pages/VPCNATGateways';

// CloudWatch
import CloudWatchDashboard from './pages/CloudWatchDashboard';
import CloudWatchAlarms from './pages/CloudWatchAlarms';
import CloudWatchLogs from './pages/CloudWatchLogs';
import CloudWatchDashboards from './pages/CloudWatchDashboards';

// DynamoDB
import DynamoDBTables from './pages/DynamoDBTables';
import DynamoDBTableDetail from './pages/DynamoDBTableDetail';

// SNS / SQS
import SNSTopics from './pages/SNSTopics';
import SQSQueues from './pages/SQSQueues';

// CloudFront / Route 53
import CloudFrontDistributions from './pages/CloudFrontDistributions';
import Route53HostedZones from './pages/Route53HostedZones';

// CloudTrail
import CloudTrailEventHistory from './pages/CloudTrailEventHistory';

function RedirectWithQuery({ to }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={query ? `${to}?${query}` : to} replace />;
}

export default function AwsApp() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* EC2 */}
            <Route path="/ec2" element={<EC2 />} />
            <Route path="/ec2/dashboard" element={<EC2Dashboard />} />
            <Route path="/ec2/instances/:instanceId" element={<EC2InstanceDetail />} />
            <Route path="/ec2/instance-types" element={<EC2InstanceTypes />} />
            <Route path="/ec2/launch-templates" element={<EC2LaunchTemplates />} />
            <Route path="/ec2/amis" element={<EC2AMIs />} />
            <Route path="/ec2/volumes" element={<EC2Volumes />} />
            <Route path="/ec2/snapshots" element={<EC2Snapshots />} />
            <Route path="/ec2/security-groups" element={<EC2SecurityGroups />} />
            <Route path="/ec2/key-pairs" element={<EC2KeyPairs />} />
            <Route path="/ec2/elastic-ips" element={<EC2ElasticIPs />} />
            <Route path="/ec2/load-balancers" element={<EC2LoadBalancers />} />
            <Route path="/ec2/target-groups" element={<EC2TargetGroups />} />
            <Route path="/ec2/auto-scaling" element={<EC2AutoScaling />} />

            {/* S3 */}
            <Route path="/s3" element={<S3Buckets />} />
            <Route path="/s3/:bucketName" element={<S3BucketDetail />} />

            {/* Lambda */}
            <Route path="/lambda" element={<LambdaFunctions />} />
            <Route path="/lambda/dashboard" element={<LambdaDashboard />} />
            <Route path="/lambda/layers" element={<LambdaLayers />} />
            <Route path="/lambda/:functionName" element={<LambdaFunctionDetail />} />

            {/* RDS */}
            <Route path="/rds" element={<RDS />} />
            <Route path="/rds/dashboard" element={<RDSDashboard />} />
            <Route path="/rds/snapshots" element={<RDSSnapshots />} />
            <Route path="/rds/subnet-groups" element={<RDSSubnetGroups />} />
            <Route path="/rds/parameter-groups" element={<RDSParameterGroups />} />
            <Route path="/rds/:dbId" element={<RDSDetail />} />

            {/* IAM */}
            <Route path="/iam" element={<IAMDashboard />} />
            <Route path="/iam/users" element={<IAMUsers />} />
            <Route path="/iam/groups" element={<IAMGroups />} />
            <Route path="/iam/roles" element={<IAMRoles />} />
            <Route path="/iam/policies" element={<IAMPolicies />} />
            <Route path="/iam/identity-providers" element={<IAMIdentityProviders />} />
            <Route path="/iam/account-settings" element={<IAMAccountSettings />} />

            {/* Billing */}
            <Route path="/billing" element={<BillingDashboard />} />
            <Route path="/billing/cost-explorer" element={<CostExplorer />} />
            <Route path="/billing/bills" element={<BillingBills />} />
            <Route path="/billing/budgets" element={<BillingBudgets />} />
            <Route path="/billing/payment-methods" element={<BillingPaymentMethods />} />
            <Route path="/billing/tax-settings" element={<BillingTaxSettings />} />

            {/* VPC */}
            <Route path="/vpc" element={<VPCDashboard />} />
            <Route path="/vpc/vpcs" element={<VPCList />} />
            <Route path="/vpc/subnets" element={<VPCSubnets />} />
            <Route path="/vpc/route-tables" element={<VPCRouteTables />} />
            <Route path="/vpc/internet-gateways" element={<VPCInternetGateways />} />
            <Route path="/vpc/nat-gateways" element={<VPCNATGateways />} />

            {/* CloudWatch */}
            <Route path="/cloudwatch" element={<CloudWatchDashboard />} />
            <Route path="/cloudwatch/alarms" element={<CloudWatchAlarms />} />
            <Route path="/cloudwatch/logs" element={<CloudWatchLogs />} />
            <Route path="/cloudwatch/dashboards" element={<CloudWatchDashboards />} />

            {/* DynamoDB */}
            <Route path="/dynamodb" element={<DynamoDBTables />} />
            <Route path="/dynamodb/:tableName" element={<DynamoDBTableDetail />} />

            {/* SNS */}
            <Route path="/sns" element={<SNSTopics />} />

            {/* SQS */}
            <Route path="/sqs" element={<SQSQueues />} />

            {/* CloudFront */}
            <Route path="/cloudfront" element={<CloudFrontDistributions />} />

            {/* Route 53 */}
            <Route path="/route53" element={<Route53HostedZones />} />

            {/* CloudTrail */}
            <Route path="/cloudtrail" element={<CloudTrailEventHistory />} />
            <Route path="/cloudtrail/event-history" element={<CloudTrailEventHistory />} />

            {/* State Inspector */}
            <Route path="/go" element={<StateInspector />} />

            {/* Catch-all */}
            <Route path="*" element={<RedirectWithQuery to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </StoreProvider>
  );
}
