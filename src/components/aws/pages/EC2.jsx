import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { RefreshCw, Search, ChevronDown, ChevronUp, X, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import ColumnToggle, { useColumnVisibility } from '../ColumnToggle';
import AccessDenied from '../AccessDenied';

const STATE_COLORS = {
  running: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  stopped: { dot: 'bg-red-400', text: 'text-gray-700', bg: 'bg-gray-100' },
  pending: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  stopping: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  'shutting-down': { dot: 'bg-red-400 animate-pulse', text: 'text-red-700', bg: 'bg-red-50' },
  terminated: { dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50' },
};

const INSTANCE_TYPES = [
  { name: 't2.micro', vcpus: 1, memory: '256 MB', storage: 'Docker', network: 'Bridge', free: true },
  { name: 't2.small', vcpus: 1, memory: '512 MB', storage: 'Docker', network: 'Bridge' },
  { name: 't3.small', vcpus: 1, memory: '512 MB', storage: 'Docker', network: 'Bridge' },
  { name: 't3.medium', vcpus: 2, memory: '1 GB', storage: 'Docker', network: 'Bridge' },
  { name: 'm5.large', vcpus: 2, memory: '1 GB', storage: 'Docker', network: 'Bridge' },
  { name: 'c5.xlarge', vcpus: 4, memory: '2 GB', storage: 'Docker', network: 'Bridge' },
];

export default function EC2() {
  const { state, dispatch, addFlash } = useStore();
  const [view, setView] = useState('list');
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [detailTab, setDetailTab] = useState('Details');
  const [stateDropdown, setStateDropdown] = useState(false);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  // AMIs from Docker images
  const [realAmis, setRealAmis] = useState([]);

  const EC2_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Instance ID' },
    { key: 'state', label: 'Instance state' },
    { key: 'type', label: 'Instance type' },
    { key: 'publicIp', label: 'Public IPv4 address' },
    { key: 'az', label: 'Availability zone' },
    { key: 'launchTime', label: 'Launch time' },
  ];
  const [visibleCols, setVisibleCols] = useColumnVisibility('ec2_instances', EC2_COLUMNS.map(c => c.key));

  // Launch wizard state
  const [launchName, setLaunchName] = useState('');
  const [launchAmi, setLaunchAmi] = useState('');
  const [launchType, setLaunchType] = useState('t2.micro');

  // Fetch real instances from Docker
  const refreshInstances = useCallback(async () => {
    try {
      const res = await fetch('/api/ec2/instances', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.instances) {
          dispatch({ type: 'SET_EC2_INSTANCES', payload: data.instances });
          setDockerAvailable(true);
        }
      } else if (res.status === 503) {
        setDockerAvailable(false);
      }
    } catch {
      setDockerAvailable(false);
    }
  }, [dispatch]);

  // Fetch real AMIs from Docker images
  const refreshAmis = useCallback(async () => {
    try {
      const res = await fetch('/api/ec2/amis', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.amis && data.amis.length > 0) {
          setRealAmis(data.amis);
          dispatch({ type: 'SET_AMIS', payload: data.amis });
          if (!launchAmi) setLaunchAmi(data.amis[0]?.imageTag || '');
        }
      }
    } catch { /* ignore */ }
  }, [dispatch, launchAmi]);

  useEffect(() => {
    refreshInstances();
    refreshAmis();
  }, [refreshInstances, refreshAmis]);

  const userRole = state.user?.role || 'admin';
  const currentRegion = state.user?.region || 'us-east-1';
  const approvedRegions = state.user?.approvedRegions || [];
  const isRestricted = userRole === 'lab-member' && approvedRegions.length > 0 && !approvedRegions.includes(currentRegion);

  if (isRestricted) {
    return <AccessDenied service="EC2" region={currentRegion} action="ec2:DescribeInstances" />;
  }

  const instances = (state.ec2 || []).filter(i => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (i.name || '').toLowerCase().includes(q) || (i.id || '').toLowerCase().includes(q) || (i.state || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    const val = sortDir === 'asc' ? 1 : -1;
    const aVal = a[sortCol] || '';
    const bVal = b[sortCol] || '';
    return aVal < bVal ? -val : aVal > bVal ? val : 0;
  });

  const selectedInstance = selectedIds.length === 1 ? state.ec2.find(i => i.id === selectedIds[0]) : null;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Real Docker state changes
  const handleStateChange = async (action) => {
    for (const id of selectedIds) {
      const inst = state.ec2.find(i => i.id === id);
      if (!inst) continue;

      try {
        if (action === 'start' && inst.state === 'stopped') {
          dispatch({ type: 'UPDATE_INSTANCE_STATE', payload: { id, state: 'pending' } });
          await fetch(`/api/ec2/instances/${id}/start`, { method: 'POST', credentials: 'include' });
          addFlash('success', `Starting instance ${id}`);
        } else if (action === 'stop' && inst.state === 'running') {
          dispatch({ type: 'UPDATE_INSTANCE_STATE', payload: { id, state: 'stopping' } });
          await fetch(`/api/ec2/instances/${id}/stop`, { method: 'POST', credentials: 'include' });
          addFlash('info', `Stopping instance ${id}`);
        } else if (action === 'terminate') {
          dispatch({ type: 'UPDATE_INSTANCE_STATE', payload: { id, state: 'shutting-down' } });
          await fetch(`/api/ec2/instances/${id}`, { method: 'DELETE', credentials: 'include' });
          addFlash('warning', `Terminated instance ${id}`);
          dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Instance terminated', message: `${inst.name} (${id}) has been terminated`, type: 'warning', service: 'EC2' } });
        } else if (action === 'reboot' && inst.state === 'running') {
          dispatch({ type: 'UPDATE_INSTANCE_STATE', payload: { id, state: 'pending' } });
          await fetch(`/api/ec2/instances/${id}/stop`, { method: 'POST', credentials: 'include' });
          await fetch(`/api/ec2/instances/${id}/start`, { method: 'POST', credentials: 'include' });
          addFlash('success', `Rebooting instance ${id}`);
        }
      } catch (e) {
        addFlash('error', `Failed to ${action} instance ${id}: ${e.message}`);
      }
    }
    setSelectedIds([]);
    setStateDropdown(false);
    // Refresh after a short delay
    setTimeout(refreshInstances, 1000);
  };

  // Real Docker launch
  const handleLaunch = async () => {
    if (!launchAmi) {
      addFlash('error', 'Please select an AMI');
      return;
    }
    setLoading(true);
    try {
      const ami = realAmis.find(a => a.imageTag === launchAmi) || {};
      const res = await fetch('/api/ec2/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: launchName || 'Unnamed Instance',
          amiTag: launchAmi,
          amiId: ami.id || '',
          amiName: ami.name || launchAmi,
          instanceType: launchType,
          platform: ami.platform || 'Linux/UNIX',
          tags: [{ Key: 'Name', Value: launchName || 'Unnamed Instance' }],
        }),
      });
      const data = await res.json();
      if (res.ok && data.instance) {
        dispatch({ type: 'LAUNCH_INSTANCE', payload: data.instance });
        addFlash('success', `Successfully launched instance ${data.instance.id}`);
        dispatch({ type: 'ADD_NOTIFICATION', payload: { title: 'Instance launched', message: `${data.instance.name} (${data.instance.id}) is now running`, type: 'success', service: 'EC2' } });
      } else {
        addFlash('error', data.error || 'Failed to launch instance');
      }
    } catch (e) {
      addFlash('error', `Launch failed: ${e.message}`);
    }
    setLoading(false);
    setView('list');
    setLaunchName(''); setLaunchType('t2.micro');
    setTimeout(refreshInstances, 1000);
  };

  // Docker not available warning
  const DockerWarning = () => !dockerAvailable ? (
    <div className="aws-alert aws-alert-warning mb-4">
      <span className="font-bold">Docker not available.</span> EC2 instances require Docker. Make sure the app has access to <code>/var/run/docker.sock</code>.
    </div>
  ) : null;

  // Launch Wizard
  if (view === 'launch') {
    const selectedAmi = realAmis.find(a => a.imageTag === launchAmi) || {};
    const selectedType = INSTANCE_TYPES.find(t => t.name === launchType) || INSTANCE_TYPES[0];
    return (
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <h1 className="text-xl font-bold text-aws-text">Launch an instance</h1>
          <DockerWarning />
          {/* Name */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-3">Name and tags</h2>
            <input className="aws-input max-w-md" placeholder="e.g. My Web Server" value={launchName} onChange={e => setLaunchName(e.target.value)} />
          </div>
          {/* AMI - from real Docker images */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-3">Application and OS Images (AMI)</h2>
            <p className="text-xs text-aws-text-secondary mb-3">Docker images matching <code>awsmock-ami:*</code> pattern</p>
            {realAmis.length === 0 ? (
              <div className="text-sm text-aws-text-secondary py-4">No AMI images found. Build them with <code>docker compose up ami-builder</code></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {realAmis.map(ami => (
                  <button key={ami.imageTag} onClick={() => setLaunchAmi(ami.imageTag)} className={`p-3 border text-left ${launchAmi === ami.imageTag ? 'border-aws-blue bg-aws-blue-light' : 'border-aws-border hover:bg-gray-50'}`} style={{ borderRadius: 8 }}>
                    <div className="font-bold text-sm">{ami.name}</div>
                    <div className="text-xs text-aws-text-secondary mt-1">{ami.description}</div>
                    <div className="text-xs text-aws-text-disabled mt-0.5">{ami.architecture} &middot; {ami.platform}</div>
                    <div className="text-xs text-green-600 mt-1 font-mono">{ami.imageTag}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Instance Type */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-3">Instance type</h2>
            <p className="text-xs text-aws-text-secondary mb-2">Maps to Docker container resource limits</p>
            <table className="aws-table">
              <thead><tr><th></th><th>Name</th><th>vCPUs</th><th>Memory</th><th>Storage</th><th>Network</th></tr></thead>
              <tbody>
                {INSTANCE_TYPES.map(t => (
                  <tr key={t.name} className={`cursor-pointer ${launchType === t.name ? 'bg-orange-50' : ''}`} onClick={() => setLaunchType(t.name)}>
                    <td><input type="radio" checked={launchType === t.name} onChange={() => setLaunchType(t.name)} /></td>
                    <td className="font-medium">{t.name}</td>
                    <td>{t.vcpus}</td><td>{t.memory}</td><td>{t.storage}</td><td>{t.network}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Summary Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="aws-card sticky top-4">
            <h3 className="font-bold text-sm mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-aws-text-secondary">AMI:</span> <span className="font-medium">{selectedAmi.name || 'None selected'}</span></div>
              <div><span className="text-aws-text-secondary">Docker image:</span> <span className="font-mono text-xs">{launchAmi || '-'}</span></div>
              <div><span className="text-aws-text-secondary">Instance type:</span> <span className="font-medium">{launchType}</span></div>
              <div><span className="text-aws-text-secondary">Resources:</span> <span className="font-medium">{selectedType.vcpus} vCPU, {selectedType.memory}</span></div>
            </div>
            <div className="mt-6 space-y-2">
              <button className="aws-btn aws-btn-call-to-action w-full" onClick={handleLaunch} disabled={loading || !launchAmi || !dockerAvailable}>
                {loading ? 'Launching...' : 'Launch instance'}
              </button>
              <button className="aws-btn aws-btn-secondary w-full" onClick={() => setView('list')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Instance List
  return (
    <div className="space-y-0">
      <DockerWarning />
      <div className="aws-card p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg">Instances ({instances.length})</h2>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => { refreshInstances(); addFlash('info', 'Instances refreshed from Docker'); }}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
            <ColumnToggle tableName="ec2_instances" columns={EC2_COLUMNS} visibleColumns={visibleCols} onToggle={setVisibleCols} />
          </div>
        </div>
        {/* Actions bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <button
              className="aws-btn aws-btn-secondary flex items-center gap-1 text-xs"
              disabled={selectedIds.length === 0}
              onClick={() => setStateDropdown(!stateDropdown)}
            >
              Instance state <ChevronDown size={12} />
            </button>
            {stateDropdown && selectedIds.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-aws-border shadow-lg z-20 w-36" style={{ borderRadius: 8 }}>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleStateChange('start')}>Start</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleStateChange('stop')}>Stop</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleStateChange('reboot')}>Reboot</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-aws-error" onClick={() => handleStateChange('terminate')}>Terminate</button>
              </div>
            )}
          </div>
          <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setView('launch')} disabled={!dockerAvailable}>Launch instances</button>
        </div>
        {/* Filter */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Find instances by attribute or tag" value={filterText} onChange={e => setFilterText(e.target.value)} />
          </div>
          {filterText && (
            <button className="flex items-center gap-1 text-xs text-aws-blue hover:underline" onClick={() => setFilterText('')}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="aws-table">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(instances.map(i => i.id)); else setSelectedIds([]); }} checked={selectedIds.length > 0 && selectedIds.length === instances.length} /></th>
                {visibleCols.includes('name') && <th className="cursor-pointer select-none" onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>}
                {visibleCols.includes('id') && <th className="cursor-pointer select-none" onClick={() => handleSort('id')}>Instance ID <SortIcon col="id" /></th>}
                {visibleCols.includes('state') && <th className="cursor-pointer select-none" onClick={() => handleSort('state')}>Instance state <SortIcon col="state" /></th>}
                {visibleCols.includes('type') && <th className="cursor-pointer select-none" onClick={() => handleSort('type')}>Instance type <SortIcon col="type" /></th>}
                {visibleCols.includes('publicIp') && <th>Public IPv4 address</th>}
                {visibleCols.includes('az') && <th className="cursor-pointer select-none" onClick={() => handleSort('az')}>Availability zone <SortIcon col="az" /></th>}
                {visibleCols.includes('launchTime') && <th className="cursor-pointer select-none" onClick={() => handleSort('launchTime')}>Launch time <SortIcon col="launchTime" /></th>}
              </tr>
            </thead>
            <tbody>
              {instances.map(inst => {
                const colors = STATE_COLORS[inst.state] || STATE_COLORS.running;
                return (
                  <tr key={inst.id} className={selectedIds.includes(inst.id) ? 'bg-blue-50/50' : ''}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(inst.id)} onChange={e => {
                        if (e.target.checked) setSelectedIds([...selectedIds, inst.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== inst.id));
                      }} />
                    </td>
                    {visibleCols.includes('name') && <td><Link to={`/ec2/instances/${inst.id}`} className="font-medium text-aws-blue hover:underline">{inst.name}</Link></td>}
                    {visibleCols.includes('id') && <td><Link to={`/ec2/instances/${inst.id}`} className="font-mono text-sm text-aws-blue hover:underline">{inst.id}</Link></td>}
                    {visibleCols.includes('state') && <td>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                        {inst.state}
                      </span>
                    </td>}
                    {visibleCols.includes('type') && <td>{inst.type}</td>}
                    {visibleCols.includes('publicIp') && <td className="font-mono text-sm">{inst.publicIp}</td>}
                    {visibleCols.includes('az') && <td>{inst.az}</td>}
                    {visibleCols.includes('launchTime') && <td>{inst.launchTime ? format(new Date(inst.launchTime), 'MMM d, yyyy h:mm a') : '-'}</td>}
                  </tr>
                );
              })}
              {instances.length === 0 && (
                <tr>
                  <td colSpan={1 + visibleCols.length} className="text-center py-8 text-aws-text-secondary">
                    No instances found.
                    <button className="text-aws-blue hover:underline ml-2" onClick={() => setView('launch')}>Launch instances</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-aws-text-secondary flex items-center justify-between">
          <span>Showing 1-{instances.length} of {instances.length} items</span>
          <div className="flex items-center gap-2">
            <button className="aws-btn aws-btn-secondary text-xs py-0.5" disabled>Previous</button>
            <span className="px-2">1</span>
            <button className="aws-btn aws-btn-secondary text-xs py-0.5" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedInstance && (
        <div className="aws-card mt-0 border-t-0">
          <div className="flex gap-4 border-b border-aws-border mb-4">
            {['Details', 'SSH', 'Networking', 'Tags'].map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)} className={`pb-2 px-1 text-sm font-medium border-b-2 ${detailTab === tab ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`}>
                {tab}
              </button>
            ))}
          </div>
          {detailTab === 'Details' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><span className="text-aws-text-secondary">Instance ID:</span> <span className="font-mono ml-2">{selectedInstance.id}</span></div>
              <div><span className="text-aws-text-secondary">Docker IP:</span> <span className="font-mono ml-2">{selectedInstance.privateIp}</span></div>
              <div><span className="text-aws-text-secondary">Instance type:</span> <span className="ml-2">{selectedInstance.type}</span></div>
              <div><span className="text-aws-text-secondary">State:</span> <span className="ml-2">{selectedInstance.state}</span></div>
              <div><span className="text-aws-text-secondary">AMI:</span> <span className="ml-2">{selectedInstance.amiName}</span></div>
              <div><span className="text-aws-text-secondary">AMI ID:</span> <span className="font-mono ml-2">{selectedInstance.ami}</span></div>
              <div><span className="text-aws-text-secondary">Platform:</span> <span className="ml-2">{selectedInstance.platform}</span></div>
              <div><span className="text-aws-text-secondary">Launch time:</span> <span className="ml-2">{selectedInstance.launchTime ? format(new Date(selectedInstance.launchTime), 'MMM d, yyyy h:mm a') : '-'}</span></div>
              {selectedInstance.containerId && (
                <div className="col-span-2"><span className="text-aws-text-secondary">Container ID:</span> <span className="font-mono ml-2 text-xs">{selectedInstance.containerId}</span></div>
              )}
            </div>
          )}
          {detailTab === 'SSH' && (
            <div className="space-y-4">
              {selectedInstance.state === 'running' && selectedInstance.sshCommand ? (
                <>
                  <div className="aws-alert aws-alert-info">
                    <Terminal size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold">SSH Connection</div>
                      <div className="mt-1">Connect to this instance using:</div>
                    </div>
                  </div>
                  <div className="aws-code flex items-center justify-between">
                    <code>{selectedInstance.sshCommand}</code>
                    <button className="text-xs text-blue-300 hover:text-white ml-4" onClick={() => { navigator.clipboard.writeText(selectedInstance.sshCommand); addFlash('success', 'SSH command copied!'); }}>Copy</button>
                  </div>
                  <div className="text-sm text-aws-text-secondary">
                    <p><strong>Default credentials:</strong> root / password</p>
                    <p className="mt-1">The instance is accessible via Docker network IP.</p>
                  </div>
                </>
              ) : (
                <div className="text-sm text-aws-text-secondary">Instance must be running to connect via SSH.</div>
              )}
            </div>
          )}
          {detailTab === 'Networking' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><span className="text-aws-text-secondary">Docker Network:</span> <span className="font-mono ml-2">awsmock-net</span></div>
              <div><span className="text-aws-text-secondary">IP Address:</span> <span className="font-mono ml-2">{selectedInstance.privateIp}</span></div>
              <div><span className="text-aws-text-secondary">Availability Zone:</span> <span className="ml-2">{selectedInstance.az}</span></div>
            </div>
          )}
          {detailTab === 'Tags' && (
            <table className="aws-table">
              <thead><tr><th>Key</th><th>Value</th></tr></thead>
              <tbody>
                {(selectedInstance.tags || []).map((t, i) => (
                  <tr key={i}><td>{t.Key}</td><td>{t.Value}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
