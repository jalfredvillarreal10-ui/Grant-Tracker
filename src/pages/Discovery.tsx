import React, { useState } from 'react';
import { Search, Save, AlertCircle } from 'lucide-react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';

interface DiscoveryProps {
  grants: Grant[];
  onMoveToApplied: (id: string) => void;
  onGrantSaved: () => void; // Trigger a refresh when saved
}

const Discovery: React.FC<DiscoveryProps> = ({ grants, onMoveToApplied, onGrantSaved }) => {
  const [searchOpp, setSearchOpp] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Backend standard format
  const [formData, setFormData] = useState({
    grant_number: '', title: '', agency: '', deadline: ''
  });

  // 1. Search Grants.gov
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchOpp) return;
    
    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/grantsgov/search/${searchOpp}`);
      const data = await response.json();
      
      if (response.ok) {
        setFormData({
          grant_number: data.grant_number,
          title: data.title,
          agency: data.agency,
          deadline: data.deadline
        });
      } else {
        setError(data.detail || "Grant not found.");
      }
    } catch (err) {
      setError("Failed to connect to backend server.");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Save to SQLite Backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grant_number) return;

    try {
      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: "Active" })
      });

      if (response.ok) {
        setFormData({ grant_number: '', title: '', agency: '', deadline: '' });
        setSearchOpp('');
        onGrantSaved(); // Tell App.tsx to refresh the dashboard
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to save grant.");
      }
    } catch (err) {
      setError("Failed to communicate with database.");
    }
  };

  const discoveryGrants = grants
    .filter(g => g.status === 'available' && g.amount >= 150000)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold text-blue-900">Grant Discovery & Intake</h1>
        <p className="text-zinc-500">Search federal databases and intake high-impact opportunities.</p>
      </header>

      {/* --- INTAKE FORM --- */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-zinc-100 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <Search className="w-5 h-5" /> Fast Intake via Grants.gov
        </h2>
        
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Enter Opportunity Number (e.g., FR-CCD-24-017)" 
            value={searchOpp}
            onChange={(e) => setSearchOpp(e.target.value)}
            className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900"
          />
          <button type="submit" disabled={isSearching} className="btn-primary whitespace-nowrap">
            {isSearching ? 'Searching...' : 'Auto-Fill Details'}
          </button>
        </form>

        {error && (
          <div className="text-red-600 text-sm flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 mt-2 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <input type="text" placeholder="Funder ID" value={formData.grant_number} onChange={e => setFormData({...formData, grant_number: e.target.value})} className="p-2 border border-zinc-200 rounded-md" required />
          <input type="date" placeholder="Deadline" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="p-2 border border-zinc-200 rounded-md" required />
          <input type="text" placeholder="Agency" value={formData.agency} onChange={e => setFormData({...formData, agency: e.target.value})} className="col-span-2 p-2 border border-zinc-200 rounded-md" required />
          <input type="text" placeholder="Opportunity Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="col-span-2 p-2 border border-zinc-200 rounded-md" required />
          
          <button type="submit" className="col-span-2 btn-primary flex items-center justify-center gap-2 mt-2 bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4" /> Add to Discovery Portfolio
          </button>
        </form>
      </div>
      {/* ------------------- */}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {discoveryGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant} 
            onMoveToApplied={onMoveToApplied}
          />
        ))}
      </div>
      
      {discoveryGrants.length === 0 && (
        <div className="p-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400">
          No high-value grants found in discovery. Use the intake form above to add one.
        </div>
      )}
    </div>
  );
};

export default Discovery;