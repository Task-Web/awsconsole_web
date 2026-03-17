import React, { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CostExplorer() {
  const { state } = useStore();
  const { billing } = state;
  const [range, setRange] = useState('6');
  const [groupBy, setGroupBy] = useState('service');

  const months = range === 'mtd' ? billing.history.slice(-1) : billing.history.slice(-parseInt(range));

  // Build stacked data by service for each month
  const stackedData = months.map(m => {
    const row = { month: m.month };
    if (groupBy === 'service') {
      billing.byService.forEach(s => {
        row[s.name] = +(s.amount * (m.amount / billing.currentMonth)).toFixed(2);
      });
    } else if (groupBy === 'region') {
      if (billing.byRegion && billing.byRegion.length > 0) {
        billing.byRegion.forEach(r => {
          row[r.region] = +(m.amount * (r.percentage / 100)).toFixed(2);
        });
      } else {
        row['us-east-1'] = +(m.amount * 0.65).toFixed(2);
        row['us-west-2'] = +(m.amount * 0.25).toFixed(2);
        row['eu-west-1'] = +(m.amount * 0.10).toFixed(2);
      }
    } else if (groupBy === 'usage_type') {
      row['BoxUsage'] = +(m.amount * 0.45).toFixed(2);
      row['DataTransfer'] = +(m.amount * 0.15).toFixed(2);
      row['Requests'] = +(m.amount * 0.10).toFixed(2);
      row['Storage'] = +(m.amount * 0.30).toFixed(2);
    } else {
      row['Total'] = m.amount;
    }
    return row;
  });

  const ranges = [
    { label: 'Month to date', value: 'mtd' },
    { label: 'Last 3 months', value: '3' },
    { label: 'Last 6 months', value: '6' },
    { label: 'Last 12 months', value: '12' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Cost Explorer</h1>

      {/* Controls */}
      <div className="aws-card flex items-center gap-4">
        <div className="flex gap-2">
          {ranges.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} className={`aws-btn text-xs ${range === r.value ? 'aws-btn-primary' : 'aws-btn-secondary'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-aws-text-secondary">Group by:</span>
          <select className="aws-input w-auto" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="service">Service</option>
            <option value="region">Region</option>
            <option value="usage_type">Usage type</option>
            <option value="total">Total</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="aws-card" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stackedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
            <Legend />
            {groupBy === 'service' ? (
              billing.byService.map((s) => (
                <Bar key={s.name} dataKey={s.name} stackId="a" fill={s.color} />
              ))
            ) : groupBy === 'region' ? (
              (billing.byRegion && billing.byRegion.length > 0) ? (
                billing.byRegion.map((r) => (
                  <Bar key={r.region} dataKey={r.region} stackId="a" fill={r.color || '#0972D3'} />
                ))
              ) : (
                <>
                  <Bar dataKey="us-east-1" stackId="a" fill="#0972D3" />
                  <Bar dataKey="us-west-2" stackId="a" fill="#FF9900" />
                  <Bar dataKey="eu-west-1" stackId="a" fill="#037F0C" />
                </>
              )
            ) : groupBy === 'usage_type' ? (
              <>
                <Bar dataKey="BoxUsage" stackId="a" fill="#0972D3" />
                <Bar dataKey="DataTransfer" stackId="a" fill="#FF9900" />
                <Bar dataKey="Requests" stackId="a" fill="#D91515" />
                <Bar dataKey="Storage" stackId="a" fill="#037F0C" />
              </>
            ) : (
              <Bar dataKey="Total" fill="#0972D3" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="aws-card">
        <h3 className="font-bold text-sm mb-4">Monthly costs</h3>
        <table className="aws-table">
          <thead><tr><th>Month</th><th>Amount</th></tr></thead>
          <tbody>
            {months.map(m => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td className="font-medium">${m.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
