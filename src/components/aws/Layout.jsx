import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, ChevronDown, ChevronRight, ChevronLeft, X, Server, HardDrive, Database, Zap, Shield, DollarSign, Star, Info, Globe, Activity, BarChart3, Mail, MessageSquare, Layers, Grid3X3 } from 'lucide-react';
import { useStore } from './store/StoreContext.jsx';
import FlashMessages from './FlashMessages';

const REGIONS = [
  { group: 'US East', regions: [
    { name: 'US East (N. Virginia)', code: 'us-east-1' },
    { name: 'US East (Ohio)', code: 'us-east-2' },
  ]},
  { group: 'US West', regions: [
    { name: 'US West (N. California)', code: 'us-west-1' },
    { name: 'US West (Oregon)', code: 'us-west-2' },
  ]},
  { group: 'Asia Pacific', regions: [
    { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1' },
    { name: 'Asia Pacific (Singapore)', code: 'ap-southeast-1' },
    { name: 'Asia Pacific (Sydney)', code: 'ap-southeast-2' },
    { name: 'Asia Pacific (Tokyo)', code: 'ap-northeast-1' },
  ]},
  { group: 'Europe', regions: [
    { name: 'Europe (Frankfurt)', code: 'eu-central-1' },
    { name: 'Europe (Ireland)', code: 'eu-west-1' },
    { name: 'Europe (London)', code: 'eu-west-2' },
  ]},
  { group: 'South America', regions: [
    { name: 'South America (Sao Paulo)', code: 'sa-east-1' },
  ]},
];

const REGION_DISPLAY = {};
REGIONS.forEach(g => g.regions.forEach(r => { REGION_DISPLAY[r.code] = r.name.match(/\(([^)]+)\)/)?.[1] || r.code; }));

const SERVICE_CATEGORIES = [
  { name: 'Compute', items: [
    { id: 'ec2', name: 'EC2', path: '/ec2', icon: Server, color: '#FF9900' },
    { id: 'lambda', name: 'Lambda', path: '/lambda', icon: Zap, color: '#FF9900' },
  ]},
  { name: 'Storage', items: [
    { id: 's3', name: 'S3', path: '/s3', icon: HardDrive, color: '#3ECF8E' },
  ]},
  { name: 'Database', items: [
    { id: 'rds', name: 'RDS', path: '/rds', icon: Database, color: '#3B48CC' },
    { id: 'dynamodb', name: 'DynamoDB', path: '/dynamodb', icon: Database, color: '#3B48CC' },
  ]},
  { name: 'Networking & Content Delivery', items: [
    { id: 'vpc', name: 'VPC', path: '/vpc', icon: Globe, color: '#8C4FFF' },
    { id: 'cloudfront', name: 'CloudFront', path: '/cloudfront', icon: Globe, color: '#8C4FFF' },
    { id: 'route53', name: 'Route 53', path: '/route53', icon: Globe, color: '#8C4FFF' },
  ]},
  { name: 'Management & Governance', items: [
    { id: 'cloudwatch', name: 'CloudWatch', path: '/cloudwatch', icon: Activity, color: '#E7157B' },
    { id: 'cloudtrail', name: 'CloudTrail', path: '/cloudtrail', icon: Activity, color: '#E7157B' },
  ]},
  { name: 'Application Integration', items: [
    { id: 'sns', name: 'SNS', path: '/sns', icon: Mail, color: '#E7157B' },
    { id: 'sqs', name: 'SQS', path: '/sqs', icon: MessageSquare, color: '#E7157B' },
  ]},
  { name: 'Security, Identity, & Compliance', items: [
    { id: 'iam', name: 'IAM', path: '/iam', icon: Shield, color: '#DD344C' },
  ]},
  { name: 'Cloud Financial Management', items: [
    { id: 'billing', name: 'Billing', path: '/billing', icon: DollarSign, color: '#1D8102' },
  ]},
];

const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(c => c.items);

const SIDEBAR_CONFIG = {
  '/': [],
  '/ec2': [
    { section: true, label: 'EC2 Dashboard', collapsible: false },
    { label: 'Dashboard', path: '/ec2/dashboard' },
    { label: 'AWS Global View', path: '/ec2', external: true },
    { label: 'Events', path: '/ec2' },
    { section: true, label: 'Instances' },
    { label: 'Instances', path: '/ec2' },
    { label: 'Instance Types', path: '/ec2/instance-types' },
    { label: 'Launch Templates', path: '/ec2/launch-templates' },
    { label: 'Spot Requests', path: '/ec2' },
    { label: 'Savings Plans', path: '/ec2' },
    { label: 'Reserved Instances', path: '/ec2' },
    { label: 'Dedicated Hosts', path: '/ec2' },
    { label: 'Capacity Reservations', path: '/ec2' },
    { label: 'Capacity Manager', path: '/ec2', badge: 'New' },
    { section: true, label: 'Images' },
    { label: 'AMIs', path: '/ec2/amis' },
    { label: 'AMI Catalog', path: '/ec2' },
    { section: true, label: 'Elastic Block Store' },
    { label: 'Volumes', path: '/ec2/volumes' },
    { label: 'Snapshots', path: '/ec2/snapshots' },
    { section: true, label: 'Network & Security' },
    { label: 'Security Groups', path: '/ec2/security-groups' },
    { label: 'Key Pairs', path: '/ec2/key-pairs' },
    { label: 'Elastic IPs', path: '/ec2/elastic-ips' },
    { section: true, label: 'Load Balancing' },
    { label: 'Load Balancers', path: '/ec2/load-balancers' },
    { label: 'Target Groups', path: '/ec2/target-groups' },
    { section: true, label: 'Auto Scaling' },
    { label: 'Auto Scaling Groups', path: '/ec2/auto-scaling' },
  ],
  '/s3': [
    { section: true, label: 'Amazon S3', collapsible: false },
    { section: true, label: 'Buckets' },
    { label: 'General purpose buckets', path: '/s3' },
    { label: 'Directory buckets', path: '/s3' },
    { label: 'Table buckets', path: '/s3' },
    { label: 'Vector buckets', path: '/s3' },
    { section: true, label: 'Access management and security' },
    { label: 'Access Points', path: '/s3' },
    { label: 'Access Points for FSx', path: '/s3' },
    { label: 'Access Grants', path: '/s3' },
    { label: 'IAM Access Analyzer', path: '/s3' },
    { section: true, label: 'Storage management and insights' },
    { label: 'Storage Lens', path: '/s3' },
    { label: 'Batch Operations', path: '/s3' },
  ],
  '/lambda': [
    { section: true, label: 'AWS Lambda', collapsible: false },
    { label: 'Dashboard', path: '/lambda/dashboard' },
    { label: 'Functions', path: '/lambda' },
    { label: 'Layers', path: '/lambda/layers' },
    { label: 'Applications', path: '/lambda' },
  ],
  '/rds': [
    { section: true, label: 'Amazon RDS', collapsible: false },
    { label: 'Dashboard', path: '/rds/dashboard' },
    { label: 'Databases', path: '/rds' },
    { section: true, label: 'Performance' },
    { label: 'Performance Insights', path: '/rds' },
    { section: true, label: 'Snapshots & backups' },
    { label: 'Snapshots', path: '/rds/snapshots' },
    { label: 'Automated backups', path: '/rds' },
    { section: true, label: 'Network' },
    { label: 'Subnet groups', path: '/rds/subnet-groups' },
    { label: 'Parameter groups', path: '/rds/parameter-groups' },
  ],
  '/iam': [
    { section: true, label: 'IAM', collapsible: false },
    { label: 'Dashboard', path: '/iam' },
    { section: true, label: 'Access management' },
    { label: 'Users', path: '/iam/users' },
    { label: 'User groups', path: '/iam/groups' },
    { label: 'Roles', path: '/iam/roles' },
    { label: 'Policies', path: '/iam/policies' },
    { label: 'Identity providers', path: '/iam/identity-providers' },
    { label: 'Account settings', path: '/iam/account-settings' },
  ],
  '/billing': [
    { section: true, label: 'Billing and Cost Management', collapsible: false },
    { label: 'Billing View', path: '/billing', badge: 'New' },
    { section: true, label: '' },
    { label: 'Home', path: '/billing' },
    { label: 'Getting Started', path: '/billing' },
    { label: 'Dashboards', path: '/billing', badge: 'New' },
    { section: true, label: 'Billing and Payments' },
    { label: 'Bills', path: '/billing/bills' },
    { label: 'Payments', path: '/billing/payment-methods' },
    { label: 'Credits', path: '/billing' },
    { label: 'Purchase Orders', path: '/billing' },
    { section: true, label: 'Cost and Usage Analysis' },
    { label: 'Cost Explorer', path: '/billing/cost-explorer' },
    { label: 'Cost Explorer Saved Reports', path: '/billing/cost-explorer' },
    { label: 'Cost Anomaly Detection', path: '/billing' },
    { label: 'Free Tier', path: '/billing' },
    { label: 'Data Exports', path: '/billing' },
    { section: true, label: 'Cost Organization' },
    { label: 'Cost Categories', path: '/billing' },
    { label: 'Cost Allocation Tags', path: '/billing/tax-settings' },
    { section: true, label: 'Budgets and Planning' },
    { label: 'Budgets', path: '/billing/budgets' },
  ],
  '/vpc': [
    { section: true, label: 'VPC', collapsible: false },
    { label: 'VPC Dashboard', path: '/vpc' },
    { section: true, label: 'Virtual private cloud' },
    { label: 'Your VPCs', path: '/vpc/vpcs' },
    { label: 'Subnets', path: '/vpc/subnets' },
    { label: 'Route tables', path: '/vpc/route-tables' },
    { label: 'Internet gateways', path: '/vpc/internet-gateways' },
    { label: 'NAT gateways', path: '/vpc/nat-gateways' },
  ],
  '/cloudwatch': [
    { section: true, label: 'CloudWatch', collapsible: false },
    { label: 'Dashboard', path: '/cloudwatch' },
    { section: true, label: 'Alarms' },
    { label: 'All alarms', path: '/cloudwatch/alarms' },
    { section: true, label: 'Logs' },
    { label: 'Log groups', path: '/cloudwatch/logs' },
    { section: true, label: 'Dashboards' },
    { label: 'Dashboards', path: '/cloudwatch/dashboards' },
  ],
  '/dynamodb': [
    { section: true, label: 'DynamoDB', collapsible: false },
    { label: 'Tables', path: '/dynamodb' },
  ],
  '/sns': [
    { section: true, label: 'Simple Notification Service', collapsible: false },
    { label: 'Topics', path: '/sns' },
  ],
  '/sqs': [
    { section: true, label: 'Simple Queue Service', collapsible: false },
    { label: 'Queues', path: '/sqs' },
  ],
  '/cloudfront': [
    { section: true, label: 'CloudFront', collapsible: false },
    { label: 'Distributions', path: '/cloudfront' },
  ],
  '/route53': [
    { section: true, label: 'Route 53', collapsible: false },
    { label: 'Hosted zones', path: '/route53' },
  ],
  '/cloudtrail': [
    { section: true, label: 'CloudTrail', collapsible: false },
    { label: 'Dashboard', path: '/cloudtrail' },
    { section: true, label: 'Events' },
    { label: 'Event history', path: '/cloudtrail/event-history' },
    { section: true, label: 'Trails' },
    { label: 'Trails', path: '/cloudtrail' },
  ],
};

function getSidebarItems(pathname) {
  if (pathname === '/go') return [];
  for (const prefix of ['/ec2', '/s3', '/lambda', '/rds', '/iam', '/billing', '/vpc', '/cloudwatch', '/cloudtrail', '/dynamodb', '/sns', '/sqs', '/cloudfront', '/route53']) {
    if (pathname.startsWith(prefix)) return SIDEBAR_CONFIG[prefix] || [];
  }
  return SIDEBAR_CONFIG['/'] || [];
}

function getServiceName(pathname) {
  if (pathname.startsWith('/ec2')) return 'EC2';
  if (pathname.startsWith('/s3')) return 'Amazon S3';
  if (pathname.startsWith('/lambda')) return 'Lambda';
  if (pathname.startsWith('/rds')) return 'RDS';
  if (pathname.startsWith('/iam')) return 'IAM';
  if (pathname.startsWith('/billing')) return 'Billing and Cost Management';
  if (pathname.startsWith('/vpc')) return 'VPC';
  if (pathname.startsWith('/cloudwatch')) return 'CloudWatch';
  if (pathname.startsWith('/dynamodb')) return 'DynamoDB';
  if (pathname.startsWith('/sns')) return 'Simple Notification Service';
  if (pathname.startsWith('/sqs')) return 'Simple Queue Service';
  if (pathname.startsWith('/cloudfront')) return 'CloudFront';
  if (pathname.startsWith('/route53')) return 'Route 53';
  if (pathname.startsWith('/cloudtrail')) return 'CloudTrail';
  if (pathname === '/go') return 'State Inspector';
  return null;
}

function getPageName(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;
  const last = segments[segments.length - 1];
  const map = {
    'security-groups': 'Security Groups',
    'key-pairs': 'Key Pairs',
    'elastic-ips': 'Elastic IPs',
    'load-balancers': 'Load Balancers',
    'target-groups': 'Target Groups',
    'auto-scaling': 'Auto Scaling Groups',
    'launch-templates': 'Launch Templates',
    'instance-types': 'Instance Types',
    'users': 'Users',
    'groups': 'User Groups',
    'roles': 'Roles',
    'policies': 'Policies',
    'identity-providers': 'Identity Providers',
    'account-settings': 'Account Settings',
    'cost-explorer': 'Cost Explorer',
    'payment-methods': 'Payment Methods',
    'tax-settings': 'Tax Settings',
    'vpcs': 'Your VPCs',
    'route-tables': 'Route Tables',
    'internet-gateways': 'Internet Gateways',
    'nat-gateways': 'NAT Gateways',
    'alarms': 'Alarms',
    'logs': 'Log Groups',
    'dashboards': 'Dashboards',
    'subnet-groups': 'Subnet Groups',
    'parameter-groups': 'Parameter Groups',
    'dashboard': 'Dashboard',
    'layers': 'Layers',
    'snapshots': 'Snapshots',
    'bills': 'Bills',
    'budgets': 'Budgets',
    'amis': 'AMIs',
    'volumes': 'Volumes',
    'event-history': 'Event history',
  };
  return map[last] || decodeURIComponent(last);
}

export default function Layout({ children }) {
  const { state, dispatch, addFlash } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [switchRoleOpen, setSwitchRoleOpen] = useState(false);
  const [switchRoleAccount, setSwitchRoleAccount] = useState('');
  const [switchRoleName, setSwitchRoleName] = useState('');
  const [switchRoleError, setSwitchRoleError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const accountRef = useRef(null);
  const regionRef = useRef(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const sidebarItems = getSidebarItems(location.pathname);
  const serviceName = getServiceName(location.pathname);
  const pageName = getPageName(location.pathname);
  const showSidebar = location.pathname !== '/go';

  const toggleSection = (label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      if (regionRef.current && !regionRef.current.contains(e.target)) setRegionOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const HELP_CONTENT = {
    '/ec2': { title: 'Amazon EC2', content: 'Amazon Elastic Compute Cloud provides resizable compute capacity in the cloud.', links: ['EC2 User Guide', 'Instance Types', 'Pricing'] },
    '/s3': { title: 'Amazon S3', content: 'Amazon Simple Storage Service is an object storage service offering industry-leading scalability.', links: ['S3 User Guide', 'Bucket Policies', 'Pricing'] },
    '/lambda': { title: 'AWS Lambda', content: 'AWS Lambda lets you run code without provisioning or managing servers.', links: ['Lambda Developer Guide', 'Triggers', 'Pricing'] },
    '/rds': { title: 'Amazon RDS', content: 'Amazon Relational Database Service makes it easy to set up, operate, and scale a relational database.', links: ['RDS User Guide', 'DB Instances', 'Pricing'] },
    '/iam': { title: 'AWS IAM', content: 'AWS Identity and Access Management enables you to manage access to AWS services securely.', links: ['IAM User Guide', 'Policies', 'Best Practices'] },
    '/billing': { title: 'AWS Billing', content: 'AWS Billing and Cost Management is the service that you use to pay your AWS bill.', links: ['Billing User Guide', 'Cost Explorer', 'Budgets'] },
    '/vpc': { title: 'Amazon VPC', content: 'Amazon Virtual Private Cloud lets you provision a logically isolated section of the AWS Cloud.', links: ['VPC User Guide', 'Subnets', 'Security'] },
    '/cloudwatch': { title: 'Amazon CloudWatch', content: 'CloudWatch monitors your AWS resources and the applications you run on AWS in real time.', links: ['CloudWatch User Guide', 'Alarms', 'Logs'] },
    '/dynamodb': { title: 'Amazon DynamoDB', content: 'DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance.', links: ['DynamoDB Guide', 'Tables', 'Pricing'] },
    '/sns': { title: 'Amazon SNS', content: 'Amazon Simple Notification Service is a fully managed messaging service for pub/sub and SMS.', links: ['SNS Guide', 'Topics', 'Subscriptions'] },
    '/sqs': { title: 'Amazon SQS', content: 'Amazon Simple Queue Service is a fully managed message queuing service.', links: ['SQS Guide', 'Queues', 'FIFO'] },
    '/cloudfront': { title: 'Amazon CloudFront', content: 'CloudFront is a fast content delivery network service that securely delivers data.', links: ['CloudFront Guide', 'Distributions', 'Pricing'] },
    '/route53': { title: 'Amazon Route 53', content: 'Route 53 is a highly available and scalable cloud Domain Name System web service.', links: ['Route 53 Guide', 'Hosted Zones', 'Health Checks'] },
    '/cloudtrail': { title: 'AWS CloudTrail', content: 'CloudTrail records API activity for your account. You can use it to audit actions taken across AWS services.', links: ['CloudTrail User Guide', 'Event History', 'Trails'] },
  };

  const helpContent = (() => {
    for (const prefix of Object.keys(HELP_CONTENT)) {
      if (location.pathname.startsWith(prefix)) return HELP_CONTENT[prefix];
    }
    return null;
  })();

  const searchResults = searchQuery.trim()
    ? ALL_SERVICES.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSearchNav = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) handleSearchNav(searchResults[0].path);
  };

  const filteredCategories = menuSearch.trim()
    ? SERVICE_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.name.toLowerCase().includes(menuSearch.toLowerCase()))
      })).filter(cat => cat.items.length > 0)
    : SERVICE_CATEGORIES;

  // Group sidebar items by sections for collapsible behavior
  const renderSidebarItems = () => {
    const groups = [];
    let currentGroup = null;

    sidebarItems.forEach((item, idx) => {
      if (item.section) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { section: item, items: [], idx };
      } else {
        if (!currentGroup) currentGroup = { section: null, items: [], idx };
        currentGroup.items.push({ ...item, idx });
      }
    });
    if (currentGroup) groups.push(currentGroup);

    return groups.map((group, gi) => {
      const sectionLabel = group.section?.label;
      const isCollapsible = group.section?.collapsible !== false && sectionLabel;
      const isCollapsed = collapsedSections[sectionLabel];

      return (
        <div key={gi}>
          {group.section && sectionLabel && (
            group.section.collapsible === false ? (
              // Service name header (non-collapsible)
              <div className="px-4 py-3 text-sm font-bold text-aws-text border-b border-gray-100 flex items-center justify-between">
                <span>{sectionLabel}</span>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-0.5 hover:bg-gray-100 rounded text-aws-text-secondary"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            ) : (
              // Collapsible section header
              <button
                onClick={() => isCollapsible && toggleSection(sectionLabel)}
                className="w-full flex items-center gap-1 px-4 py-2 mt-1 text-left"
              >
                {isCollapsible && (
                  <svg width="10" height="10" viewBox="0 0 10 10" className={`flex-shrink-0 text-aws-text-secondary transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>
                    <path d="M2 3 L5 6 L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                <span className="text-xs font-bold text-aws-text-secondary">{sectionLabel}</span>
              </button>
            )
          )}
          {!isCollapsed && group.items.map((item) => {
            const isActive = item.path === location.pathname;
            const isFav = (state.favorites || []).includes(item.path);
            return (
              <div key={item.idx} className="flex items-center group">
                <Link
                  to={item.path}
                  className={`aws-sidebar-item flex-1 ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                  {item.external && (
                    <svg width="12" height="12" viewBox="0 0 12 12" className="ml-1 inline text-aws-text-disabled">
                      <path d="M3.5 3C3.5 3 8 3 8 3M8 3V7.5M8 3L3 8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                  {item.badge && (
                    <span className="ml-2 text-xs text-red-600 font-medium">{item.badge}</span>
                  )}
                </Link>
                {item.path && !item.section && (
                  <button
                    className={`pr-3 transition-opacity ${isFav ? 'text-aws-orange opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-aws-orange'}`}
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_FAVORITE', payload: item.path }); }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={12} fill={isFav ? '#FF9900' : 'none'} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-aws-bg">
      {/* Top Navigation Bar */}
      <header className="bg-aws-squid text-white h-[48px] flex items-center px-3 justify-between z-50 fixed w-full top-0">
        <div className="flex items-center gap-1">
          {/* AWS Logo */}
          <Link to="/" className="flex items-center hover:opacity-80 px-2 py-1">
            <svg viewBox="0 0 60 36" className="h-5" style={{ width: 40 }}>
              <text x="2" y="22" fill="white" fontSize="22" fontWeight="bold" fontFamily="'Amazon Ember', 'Helvetica Neue', Arial, sans-serif">aws</text>
              <path d="M5 28 Q30 36 55 28" stroke="#FF9900" fill="none" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </Link>

          {/* Services Grid Icon */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Services"
          >
            <Grid3X3 size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search"
              className="w-full text-white text-sm pl-9 pr-20 py-1.5 focus:outline-none focus:ring-1 focus:ring-aws-blue placeholder-gray-400"
              style={{ background: '#1B2A3B', border: '1px solid #4a5568', borderRadius: 8 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs border border-gray-600 px-1.5 py-0.5 rounded" style={{ fontSize: 10 }}>[Option+S]</span>
          </div>
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white text-aws-text shadow-lg border border-aws-border z-50 max-h-80 overflow-y-auto" style={{ borderRadius: 12 }}>
              <div className="px-3 py-2 text-xs font-bold text-aws-text-secondary border-b">Services</div>
              {searchResults.map(s => (
                <button
                  key={s.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors"
                  onMouseDown={() => handleSearchNav(s.path)}
                >
                  <s.icon size={16} style={{ color: s.color }} />
                  <div>
                    <span className="text-sm font-medium text-aws-blue">{s.name}</span>
                    <div className="text-xs text-aws-text-secondary">{SERVICE_CATEGORIES.find(c => c.items.some(i => i.id === s.id))?.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Right Cluster */}
        <div className="flex items-center gap-0 text-sm">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setAccountOpen(false); setRegionOpen(false); }}
              className="relative p-2 hover:bg-white/10 transition-colors rounded"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: 10 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-96 bg-white text-aws-text shadow-xl border border-aws-border z-50 max-h-96 overflow-y-auto animate-fade-in" style={{ borderRadius: 12 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-bold text-sm">Notifications ({unreadCount} unread)</span>
                  <button
                    className="text-xs text-aws-blue hover:underline"
                    onClick={() => {
                      state.notifications.forEach(n => {
                        if (!n.read) dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id });
                      });
                    }}
                  >
                    Mark all as read
                  </button>
                </div>
                {state.notifications.length === 0 ? (
                  <div className="p-6 text-center text-aws-text-secondary text-sm">No notifications</div>
                ) : (
                  state.notifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                      onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })}
                    >
                      {!n.read && <div className="w-2 h-2 rounded-full bg-aws-blue mt-1.5 flex-shrink-0" />}
                      {n.read && <div className="w-2 h-2 mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{n.title}</div>
                        <div className="text-xs text-aws-text-secondary truncate">{n.message}</div>
                        <div className="text-xs text-aws-text-disabled mt-1">{n.service} &middot; {new Date(n.timestamp).toLocaleDateString()}</div>
                      </div>
                      <button
                        className="text-aws-text-disabled hover:text-aws-error flex-shrink-0 p-1 rounded"
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DISMISS_NOTIFICATION', payload: n.id }); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Help */}
          {helpContent && (
            <button
              className="p-2 hover:bg-white/10 transition-colors rounded"
              onClick={() => setInfoOpen(!infoOpen)}
              title="Help"
            >
              <HelpCircle size={16} />
            </button>
          )}

          {/* Region Selector */}
          <div className="relative" ref={regionRef}>
            <button
              onClick={() => { setRegionOpen(!regionOpen); setNotifOpen(false); setAccountOpen(false); }}
              className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 transition-colors rounded"
            >
              <span className="text-sm">{REGION_DISPLAY[state.user.region] || state.user.region}</span>
              <ChevronDown size={12} />
            </button>
            {regionOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-aws-dark text-white shadow-xl border border-gray-700 z-50 max-h-96 overflow-y-auto animate-fade-in" style={{ borderRadius: 12, background: '#1B2A3B' }}>
                {REGIONS.map(group => (
                  <div key={group.group}>
                    <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700 font-bold">{group.group}</div>
                    {group.regions.map(r => (
                      <button
                        key={r.code}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${state.user.region === r.code ? 'text-white font-bold' : ''}`}
                        onClick={() => {
                          dispatch({ type: 'SET_REGION', payload: r.code });
                          setRegionOpen(false);
                        }}
                      >
                        <span>{r.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{r.code}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => { setAccountOpen(!accountOpen); setNotifOpen(false); setRegionOpen(false); }}
              className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 transition-colors rounded"
            >
              <span className="text-sm">{state.user.name}</span>
              {state.user.role && state.user.role !== 'admin' && state.user.role !== 'lab-member' && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">{state.user.role}</span>
              )}
              <ChevronDown size={12} />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white text-aws-text shadow-xl border border-aws-border z-50 animate-fade-in" style={{ borderRadius: 12 }}>
                <div className="px-4 py-3 border-b bg-gray-50" style={{ borderRadius: '12px 12px 0 0' }}>
                  <div className="text-xs text-aws-text-secondary">Account ID</div>
                  <div className="font-mono text-sm">{state.user.accountId}</div>
                  <div className="text-xs text-aws-text-secondary mt-1">{state.user.accountAlias}</div>
                </div>
                <div className="py-1">
                  <Link to="/billing" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 text-aws-blue">My Account</Link>
                  <Link to="/billing" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 text-aws-blue">My Billing Dashboard</Link>
                  <Link to="/iam" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 text-aws-blue">My Security Credentials</Link>
                </div>
                <div className="border-t py-1" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button className="w-full text-left px-4 py-2 text-sm text-aws-blue hover:bg-gray-50" onClick={() => { setAccountOpen(false); setSwitchRoleOpen(true); setSwitchRoleError(''); setSwitchRoleName(''); setSwitchRoleAccount(state.user.accountId || ''); }}>Switch Role</button>
                  <div className="px-4 py-2 text-sm text-aws-text-disabled cursor-not-allowed">Sign Out</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Services Mega Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[48px] bg-black/50 z-40" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white shadow-xl border-r border-aws-border overflow-y-auto animate-fade-in" style={{ width: 520, height: 'calc(100vh - 48px)' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center gap-3">
              <Search size={16} className="text-gray-400" />
              <input
                className="flex-1 text-sm focus:outline-none"
                placeholder="Search services..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                autoFocus
              />
              <button onClick={() => setIsMenuOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-5">
              {filteredCategories.map(cat => (
                <div key={cat.name} className="mb-5">
                  <h3 className="text-xs font-bold text-aws-text-secondary uppercase mb-2 tracking-wider">{cat.name}</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.items.map(item => (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 px-3 text-sm text-aws-blue hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <item.icon size={16} style={{ color: item.color }} />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-nav breadcrumb bar (like real AWS) */}
      {serviceName && location.pathname !== '/' && (
        <div className="fixed top-[48px] left-0 right-0 z-30 bg-white border-b border-aws-border h-[36px] flex items-center px-4">
          <div className="flex items-center gap-1.5 text-sm">
            {/* Service icon */}
            <div className="w-6 h-6 rounded-full bg-aws-squid flex items-center justify-center flex-shrink-0">
              {(() => {
                const prefix = '/' + location.pathname.split('/')[1];
                const svc = ALL_SERVICES.find(s => s.path === prefix);
                if (svc) {
                  const Icon = svc.icon;
                  return <Icon size={12} className="text-white" />;
                }
                return null;
              })()}
            </div>
            <Link to={`/${location.pathname.split('/')[1]}`} className="text-aws-blue hover:underline text-sm font-medium">{serviceName}</Link>
            {pageName && (
              <>
                <ChevronRight size={14} className="text-aws-text-disabled" />
                <span className="text-aws-text text-sm">{pageName}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex flex-1 ${serviceName && location.pathname !== '/' ? 'pt-[84px]' : 'pt-[48px]'}`}>
        {/* Sidebar */}
        {showSidebar && sidebarItems.length > 0 && !sidebarCollapsed && (
          <aside className={`w-[220px] bg-white border-r border-aws-border flex-shrink-0 overflow-y-auto fixed left-0 ${serviceName && location.pathname !== '/' ? 'top-[84px]' : 'top-[48px]'}`} style={{ height: serviceName && location.pathname !== '/' ? 'calc(100vh - 84px)' : 'calc(100vh - 48px)' }}>
            <nav className="py-0">
              {(state.favorites || []).length > 0 && (
                <>
                  <div className="aws-sidebar-section mt-1">Favorites</div>
                  {(state.favorites || []).map(favPath => {
                    const svc = ALL_SERVICES.find(s => s.path === favPath);
                    if (!svc) return null;
                    const isActive = location.pathname.startsWith(svc.path);
                    return (
                      <div key={`fav-${svc.id}`} className="flex items-center group">
                        <Link to={svc.path} className={`aws-sidebar-item flex-1 ${isActive ? 'active' : ''}`}>{svc.name}</Link>
                        <button className="pr-3 text-aws-orange" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_FAVORITE', payload: svc.path }); }}>
                          <Star size={12} fill="#FF9900" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="border-b border-gray-100 my-1" />
                </>
              )}
              {renderSidebarItems()}
            </nav>
          </aside>
        )}

        {/* Collapsed sidebar toggle */}
        {showSidebar && sidebarItems.length > 0 && sidebarCollapsed && (
          <div className={`fixed left-0 ${serviceName && location.pathname !== '/' ? 'top-[84px]' : 'top-[48px]'} z-20`}>
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 bg-white border border-aws-border border-l-0 rounded-r-lg shadow-sm hover:bg-gray-50"
              title="Expand sidebar"
            >
              <ChevronRight size={16} className="text-aws-text-secondary" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto ${showSidebar && sidebarItems.length > 0 && !sidebarCollapsed ? 'ml-[220px]' : ''}`}>
          <FlashMessages />
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Info Panel */}
        {infoOpen && helpContent && (
          <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setInfoOpen(false)} />
            <aside className="fixed right-0 top-[48px] bg-white border-l border-aws-border shadow-xl z-50 overflow-y-auto animate-slide-in-right" style={{ width: 320, height: 'calc(100vh - 48px)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border bg-gray-50">
                <h3 className="font-bold text-sm">{helpContent.title}</h3>
                <button onClick={() => setInfoOpen(false)} className="text-gray-500 hover:text-aws-text p-1 rounded">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-aws-text-secondary leading-relaxed">{helpContent.content}</p>
                <div>
                  <h4 className="font-bold text-xs text-aws-text-secondary uppercase mb-2">Related links</h4>
                  <ul className="space-y-1">
                    {helpContent.links.map(link => (
                      <li key={link}><span className="text-sm text-aws-blue hover:underline cursor-pointer">{link}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Switch Role Modal */}
      {switchRoleOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-md border border-aws-border" style={{ borderRadius: 12 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50" style={{ borderRadius: '12px 12px 0 0' }}>
              <h3 className="font-bold text-sm">Switch Role</h3>
              <button onClick={() => setSwitchRoleOpen(false)}><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-aws-text-secondary">To switch roles, provide the account and role name. Your current permissions will be replaced by the permissions of the role you switch to.</p>
              <div>
                <label className="block text-sm font-bold mb-1">Account ID</label>
                <input className="aws-input" value={switchRoleAccount} onChange={e => setSwitchRoleAccount(e.target.value)} placeholder="Account ID or alias" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Role name</label>
                <input className="aws-input" value={switchRoleName} onChange={e => { setSwitchRoleName(e.target.value); setSwitchRoleError(''); }} placeholder="Role name" />
              </div>
              {switchRoleError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{switchRoleError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button className="aws-btn aws-btn-secondary" onClick={() => setSwitchRoleOpen(false)}>Cancel</button>
                <button className="aws-btn aws-btn-primary" onClick={() => {
                  const roleName = switchRoleName.trim();
                  if (!roleName) { setSwitchRoleError('Role name is required.'); return; }
                  const availableRoles = (state.iam?.roles || []).map(r => r.name);
                  if (availableRoles.length > 0 && !availableRoles.includes(roleName)) {
                    setSwitchRoleError(`Role "${roleName}" not found. Check the role name and try again.`);
                    return;
                  }
                  dispatch({ type: 'SWITCH_ROLE', payload: roleName });
                  addFlash('success', `Successfully switched to role "${roleName}".`);
                  setSwitchRoleOpen(false);
                }}>Switch Role</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-aws-squid text-gray-400 text-xs py-2 px-4 flex items-center justify-between border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span className="hover:text-white cursor-pointer">CloudShell</span>
          <span className="hover:text-white cursor-pointer">Feedback</span>
          <span className="hover:text-white cursor-pointer">Console Mobile App</span>
        </div>
        <div className="flex items-center gap-4">
          <span>&copy; 2026, Amazon Web Services, Inc. or its affiliates.</span>
          <span className="hover:text-white cursor-pointer">Privacy</span>
          <span className="hover:text-white cursor-pointer">Terms</span>
          <span className="hover:text-white cursor-pointer">Cookie preferences</span>
        </div>
      </footer>
    </div>
  );
}
