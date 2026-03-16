import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react';
import type { Grant } from '../types/grant';
import GrantCard from '../components/GrantCard';

interface DiscoveryProps {
  grants: Grant[];
  onMoveToApplied: (id: string) => void;
  onGrantSaved: () => void; // Trigger a refresh when saved
}

const Discovery: React.FC<DiscoveryProps> = ({ grants, onGrantSaved }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Track which grants are already in your local SQLite DB
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // 1. Run a default search on load & track already saved grants
  useEffect(() => {
    runSearch("Texas"); 
    
    // Create a set of grant_numbers we already track so we don't save duplicates
    const existingIds = new Set(grants.map(g => g.funderId));
    setSavedIds(existingIds);
  }, [grants]);

  const runSearch = async (keyword: string) => {
    if (!keyword) return;
    setIsSearching(true);
    setError(null);
    
    try {
      // Points to the powerful keyword endpoint in your main.py!
      const response = await fetch(`http://localhost:8000/api/grantsgov/keyword/${encodeURIComponent(keyword)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        const errData = await response.json();
        setError(errData.detail || "Failed to fetch search results.");
      }
    } catch (err) {
      setError("Failed to connect to backend server.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const handleSaveToPortfolio = async (grant: any) => {
    if (savedIds.has(grant.grant_number)) return;

    try {
      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_number: grant.grant_number,
          title: grant.title,
          agency: grant.agency,
          deadline: grant.deadline || "2099-12-31",
          status: "available", // Matches the default in your main.py
          amount: 0
        })
      });

      if (response.ok) {
        setSavedIds(prev => new Set(prev).add(grant.grant_number));
        onGrantSaved(); // Tells App.tsx to hit the database and refresh
      } else {
        const errorData = await response.json();
        alert(`Error saving: ${errorData.detail}`);
      }
    } catch (err) {
      alert("Failed to communicate with database.");
    }
  };

  // Formats '2026-03-06' to 'Mar 6, 2026' to match Grants.gov
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '2099-12-31') return 'Rolling / Open';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Opportunity Search</h1>
        <p className="text-zinc-500">Search the live federal database. Results are automatically sorted by urgent deadlines.</p>
      </header>

      {/* --- SEARCH BAR --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Grants.gov by keyword" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-12 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900 text-base"
            />
          </div>
          <button type="submit" disabled={isSearching} className="btn-primary whitespace-nowrap px-8">
            {isSearching ? 'Searching...' : 'Search Grants'}
          </button>
        </form>

        {error && (
          <div className="mt-4 text-red-600 text-sm flex items-center gap-2 font-medium bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* --- LIST VIEW TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-600 uppercase tracking-wider">
                <th className="p-4 font-bold w-32">Close Date</th>
                <th className="p-4 font-bold w-24">Status</th>
                <th className="p-4 font-bold">Title & Opportunity Number</th>
                <th className="p-4 font-bold w-1/4">Agency</th>
                <th className="p-4 font-bold text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.length === 0 && !isSearching ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-medium">No active grants found. Try a broader keyword.</td>
                </tr>
              ) : (
                searchResults.map((result, idx) => {
                  const isSaved = savedIds.has(result.grant_number);
                  return (
                    <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="p-4 whitespace-nowrap align-top font-medium text-zinc-900">
                        {formatDate(result.deadline)}
                      </td>
                      
                      <td className="p-4 align-top">
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
                          Open
                        </span>
                      </td>

                      <td className="p-4 align-top">
                        <div className="font-bold text-emerald-700 hover:underline cursor-pointer mb-1 text-base leading-tight">
                          {result.title}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          <span className="font-bold text-zinc-700">Number:</span> {result.grant_number}
                        </div>
                      </td>

                      <td className="p-4 align-top text-sm text-zinc-700">
                        {result.agency}
                      </td>

                      <td className="p-4 align-top text-center">
                        <button 
                          onClick={() => handleSaveToPortfolio(result)}
                          disabled={isSaved}
                          className={`w-full py-2 px-3 rounded-md text-xs font-bold uppercase flex items-center justify-center gap-1 transition-all ${
                            isSaved 
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                              : 'bg-white border border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white'
                          }`}
                        >
                          {isSaved ? (
                            <><CheckCircle2 className="w-3 h-3" /> Tracked</>
                          ) : (
                            <><PlusCircle className="w-3 h-3" /> Track</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Discovery;