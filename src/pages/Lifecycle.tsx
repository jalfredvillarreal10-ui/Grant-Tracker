import React from 'react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';

interface LifecycleProps {
  grants: Grant[];
}

const Lifecycle: React.FC<LifecycleProps> = ({ grants }) => {
  const lifecycleGrants = grants
    .filter(g => g.status === 'applied')
    .sort((a, b) => {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return dateA - dateB;
    });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold text-blue-900">Application Lifecycle</h1>
        <p className="text-zinc-500">Monitoring submitted applications and pending decisions.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {lifecycleGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant} 
          />
        ))}
      </div>
    </div>
  );
};

export default Lifecycle;
