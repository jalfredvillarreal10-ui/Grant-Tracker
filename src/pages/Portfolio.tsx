import React, { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';
import CloseoutChecklistModal from '../components/CloseoutChecklistModal';

interface PortfolioProps {
  grants: Grant[];
  onAction: (id: string, action: string) => Promise<void>;
  onSaveEdit: (grant: Grant) => Promise<boolean | void>;
}

type PortfolioFilter = 'active' | 'recent' | 'extension' | 'closed';

const Portfolio: React.FC<PortfolioProps> = ({ grants, onAction, onSaveEdit }) => {
  const [filter, setFilter] = useState<PortfolioFilter>('active');
  const [grantForCloseout, setGrantForCloseout] = useState<Grant | null>(null);

  const getFilteredGrants = () => {
    const filtered = grants.filter(g => {
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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div>
          <h1 className="text-3xl font-bold text-app-primary">Awarded Grants Portfolio</h1>
          <p className="text-app-secondary">Active management of secured funds and departmental priority assets.</p>
        </div>
      </header>

      <div className="self-start rounded-xl border border-app-border bg-app-card p-2 shadow-sm">
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 text-app-secondary-muted/80">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase">View:</span>
        </div>
        <div className="relative group">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as PortfolioFilter)}
            className="appearance-none rounded-lg bg-app-muted py-2 pl-4 pr-10 text-sm font-bold text-app-primary cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="active">All Active Awards</option>
            <option value="recent">Recently Awarded (90 Days)</option>
            <option value="extension">Under Extension</option>
            <option value="closed">Successfully Closed</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-app-primary" />
        </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {filteredGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant} 
            onSaveEdit={onSaveEdit}
            approvedDetailMetric="ceiling"
            onAction={(id, action) => {
              if (action === 'close') {
                setGrantForCloseout(grant)
                return
              }
              void onAction(id, action)
            }}
          />
        ))}
      </div>

      {filteredGrants.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-app-border bg-app-muted p-12 text-center text-app-secondary-muted/80">
          No records found for the selected filter.
        </div>
      )}

      <CloseoutChecklistModal
        grant={grantForCloseout}
        isOpen={!!grantForCloseout}
        onClose={() => setGrantForCloseout(null)}
        onConfirm={async (grant) => {
          await onAction(grant.id, 'close')
          setGrantForCloseout(null)
        }}
      />
    </div>
  );
};

export default Portfolio;
