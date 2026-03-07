import React, { useState } from 'react';
import { Download, Filter, ChevronDown } from 'lucide-react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';

interface PortfolioProps {
  grants: Grant[];
  onAction: (id: string, action: string) => void;
}

type PortfolioFilter = 'active' | 'recent' | 'extension' | 'closed';

const Portfolio: React.FC<PortfolioProps> = ({ grants, onAction }) => {
  const [filter, setFilter] = useState<PortfolioFilter>('active');

  const getFilteredGrants = () => {
    let filtered = grants.filter(g => {
      if (filter === 'closed') return g.status === 'closed';
      if (g.status !== 'approved') return false;
      
      if (filter === 'recent') {
        if (!g.onboardingDate) return false;
        const onboardingDate = new Date(g.onboardingDate);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return onboardingDate >= ninetyDaysAgo;
      }
      
      if (filter === 'extension') {
        return g.isExtended || g.renewalStatus === 'Initiated';
      }
      
      return true; // Default 'active'
    });

    // Pinning and Sorting Logic
    return filtered.sort((a, b) => {
      const getUrgency = (g: Grant) => {
        if (!g.expirationDate) return 999;
        const expDate = new Date(g.expirationDate);
        const today = new Date();
        const days = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days;
      };

      const urgencyA = getUrgency(a);
      const urgencyB = getUrgency(b);

      // Rule: Pin within 30 days to top
      const isCriticalA = urgencyA <= 30;
      const isCriticalB = urgencyB <= 30;

      if (isCriticalA && !isCriticalB) return -1;
      if (!isCriticalA && isCriticalB) return 1;

      // Otherwise sort by expiration date soonest first
      return urgencyA - urgencyB;
    });
  };

  const filteredGrants = getFilteredGrants();

  const handleExport = () => {
    // Logic for Monthly Grant Status Report for Health Department Director
    console.log("Exporting Monthly Grant Status Report...");
    alert("Generating Monthly Grant Status Report for the Health Department Director...");
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Awarded Grants Portfolio</h1>
          <p className="text-zinc-500">Active management of secured funds and departmental priority assets.</p>
        </div>
        <button 
          onClick={handleExport}
          className="btn-primary flex items-center gap-2 bg-[#002d62] text-white"
        >
          <Download size={18} /> Quick Export
        </button>
      </header>

      <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-zinc-100 self-start">
        <div className="flex items-center gap-2 px-3 text-zinc-400">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase">View:</span>
        </div>
        <div className="relative group">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as PortfolioFilter)}
            className="appearance-none bg-zinc-50 border-none py-2 pl-4 pr-10 rounded-lg text-sm font-bold text-blue-900 cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="active">All Active Awards</option>
            <option value="recent">Recently Awarded (90 Days)</option>
            <option value="extension">Under Extension</option>
            <option value="closed">Successfully Closed</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -transform -translate-y-1/2 text-blue-900 pointer-events-none" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {filteredGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant} 
            onAction={onAction}
          />
        ))}
      </div>

      {filteredGrants.length === 0 && (
        <div className="p-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400">
          No records found for the selected filter.
        </div>
      )}
    </div>
  );
};

export default Portfolio;
