import React, { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { Search, Image, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export default function EC2AMIs() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [tab, setTab] = useState('owned'); // 'owned' | 'public'

  const allAmis = state.amis || [];
  const filtered = allAmis.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'owned' ? (a.owner === '123456789012' || !a.public) : a.public;
    return matchSearch && matchTab;
  });

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(a => a.id));

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><Image size={18} /> AMIs</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="aws-input pl-7 text-sm w-56" placeholder="Search AMIs..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            
            <button className="aws-btn aws-btn-secondary text-xs" disabled={!selected.length} onClick={() => { addFlash('info', `Launched instance from AMI ${selected[0]}`); setSelected([]); }}>Launch instance from AMI</button>
            <button className="aws-btn aws-btn-secondary text-xs text-red-600" disabled={!selected.length} onClick={() => { selected.forEach(id => dispatch({ type: 'DELETE_AMI', payload: id })); addFlash('success', `${selected.length} AMI(s) deregistered.`); setSelected([]); }}>Deregister AMI</button>
          </div>
        </div>
        <div className="flex border-b border-aws-border">
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'owned' ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`} onClick={() => { setTab('owned'); setSelected([]); }}>Owned by me</button>
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'public' ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`} onClick={() => { setTab('public'); setSelected([]); }}>Public images</button>
        </div>
        <table className="aws-table">
          <thead><tr>
            <th><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
            <th>Name</th><th>AMI ID</th><th>Owner</th><th>State</th><th>Architecture</th><th>Platform</th><th>Root device type</th><th>Created</th>
          </tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={selected.includes(a.id) ? 'bg-blue-50' : ''}>
                <td><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                <td className="text-aws-blue font-medium">{a.name}</td>
                <td className="font-mono text-sm">{a.id}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs font-medium ${a.owner === 'amazon' ? 'bg-orange-100 text-orange-800' : a.owner === '123456789012' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {a.owner === '123456789012' ? 'self' : a.owner}
                </span></td>
                <td><span className={`px-2 py-0.5 rounded text-xs font-medium ${a.state === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.state}</span></td>
                <td>{a.architecture}</td>
                <td>{a.platform}</td>
                <td>{a.rootDeviceType}</td>
                <td>{format(new Date(a.created), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-aws-text-secondary">No AMIs found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
