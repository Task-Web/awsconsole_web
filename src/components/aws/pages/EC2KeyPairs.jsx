import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { RefreshCw, Search, X, ChevronDown, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function EC2KeyPairs() {
  const { state, dispatch, addFlash } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [keyType, setKeyType] = useState('RSA');
  const [creating, setCreating] = useState(false);

  // Fetch real key pairs from backend
  const refreshKeyPairs = useCallback(async () => {
    try {
      const res = await fetch('/api/ec2/keypairs', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.keyPairs) {
          dispatch({ type: 'SET_KEY_PAIRS', payload: data.keyPairs });
        }
      }
    } catch { /* ignore */ }
  }, [dispatch]);

  useEffect(() => {
    refreshKeyPairs();
  }, [refreshKeyPairs]);

  const kps = (state.keyPairs || []).filter(kp =>
    !search || kp.name.toLowerCase().includes(search.toLowerCase()) || (kp.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (name) => setSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  const toggleAll = () => setSelected(selected.length === kps.length ? [] : kps.map(kp => kp.name));

  // Create real key pair via API
  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/ec2/keypairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), type: keyType }),
      });
      const data = await res.json();
      if (res.ok && data.keyPair) {
        // Add to store
        dispatch({ type: 'CREATE_KEY_PAIR', payload: data.keyPair });

        // Download private key as .pem file
        if (data.privateKey) {
          const blob = new Blob([data.privateKey], { type: 'application/x-pem-file' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name.trim()}.pem`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        addFlash('success', `Key pair "${name}" created. The private key file (.pem) has been downloaded. Save it securely — it cannot be downloaded again.`);
        setShowCreate(false);
        setName('');
      } else {
        addFlash('error', data.error || 'Failed to create key pair');
      }
    } catch (e) {
      addFlash('error', `Failed to create key pair: ${e.message}`);
    }
    setCreating(false);
  };

  // Delete key pair via API
  const handleDelete = async () => {
    if (!selected.length) return;
    for (const kpName of selected) {
      try {
        await fetch(`/api/ec2/keypairs/${encodeURIComponent(kpName)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        dispatch({ type: 'DELETE_KEY_PAIR', payload: kpName });
      } catch { /* ignore */ }
    }
    addFlash('success', `${selected.length} key pair(s) deleted.`);
    setSelected([]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    addFlash('info', `Copied: ${text}`);
  };

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg">Key Pairs ({(state.keyPairs || []).length})</h2>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => { refreshKeyPairs(); addFlash('info', 'Key pairs refreshed'); }}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
            <div className="relative">
              <button className="aws-btn aws-btn-secondary text-xs flex items-center gap-1" disabled={!selected.length}>
                Actions <ChevronDown size={12} />
              </button>
            </div>
            <button className="aws-btn aws-btn-secondary text-xs text-red-600" disabled={!selected.length} onClick={handleDelete}>Delete</button>
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create key pair</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter key pairs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th className="w-8"><input type="checkbox" checked={selected.length === kps.length && kps.length > 0} onChange={toggleAll} /></th>
              <th>Key pair name</th>
              <th>Key pair ID</th>
              <th>Type</th>
              <th>Fingerprint</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {kps.map(kp => (
              <tr key={kp.name} className={selected.includes(kp.name) ? 'bg-blue-50/50' : ''}>
                <td><input type="checkbox" checked={selected.includes(kp.name)} onChange={() => toggleSelect(kp.name)} /></td>
                <td className="text-aws-blue font-medium">{kp.name}</td>
                <td>
                  <span className="font-mono text-sm">{kp.id}</span>
                  <button className="ml-1 text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(kp.id)}><Copy size={12} /></button>
                </td>
                <td>{kp.type}</td>
                <td className="font-mono text-xs text-aws-text-secondary max-w-xs truncate">{kp.fingerprint}</td>
                <td>{kp.created ? format(new Date(kp.created), 'MMM d, yyyy h:mm a') : '-'}</td>
              </tr>
            ))}
            {kps.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-aws-text-secondary">No key pairs found. Create one to use with your instances.</td></tr>}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-aws-text-secondary">
          Showing 1-{kps.length} of {kps.length} items
        </div>
      </div>

      {showCreate && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-md">
            <div className="aws-modal-header">
              <h3 className="font-bold text-lg">Create key pair</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="aws-modal-body space-y-4">
              <div>
                <label className="aws-form-label">Name <span className="text-red-500">*</span></label>
                <input className="aws-input mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="my-key-pair" />
              </div>
              <div>
                <label className="aws-form-label">Key pair type</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm border border-aws-border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="radio" checked={keyType === 'RSA'} onChange={() => setKeyType('RSA')} /> RSA
                  </label>
                  <label className="flex items-center gap-2 text-sm border border-aws-border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="radio" checked={keyType === 'ED25519'} onChange={() => setKeyType('ED25519')} /> ED25519
                  </label>
                </div>
              </div>
              <div className="aws-alert aws-alert-warning text-xs">
                <Download size={16} className="flex-shrink-0 mt-0.5" />
                <span>The private key will be downloaded <strong>once</strong> when you create the key pair. Store it securely — you will not be able to download it again.</span>
              </div>
              <div className="aws-alert aws-alert-info text-xs">
                <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>When you launch an instance with this key pair, the public key is injected into the container. Connect with: <code>ssh -i {name || 'key'}.pem root@IP</code></span>
              </div>
            </div>
            <div className="aws-modal-footer">
              <button className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="aws-btn aws-btn-primary" onClick={handleCreate} disabled={!name.trim() || creating}>
                {creating ? 'Creating...' : 'Create key pair'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
