import React from 'react';
import { Info } from 'lucide-react';

export default function Placeholder({ title = 'Coming Soon' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-aws-text-secondary">
      <Info size={48} className="mb-4 text-aws-text-disabled" />
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm">This feature is not yet available in the mock console.</p>
    </div>
  );
}
