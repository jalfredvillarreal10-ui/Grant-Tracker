import React from 'react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';

interface PortfolioProps {
  grants: Grant[];
  onAction: (id: string, action: string) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ grants, onAction }) => {
  const portfolioGrants = grants
    .filter(g => g.status === 'approved')
    .sort((a, b) => {
      const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : 0;
      const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : 0;
      return dateA - dateB;
    });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold text-blue-900">Grants Portfolio</h1>
        <p className="text-zinc-500">Active management of secured funds and compliance tracking.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {portfolioGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant} 
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
};

export default Portfolio;
