import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, PlusCircle, CheckCircle2, Filter } from 'lucide-react';
import type { Grant } from '../types/grant';

interface DiscoveryProps {
  grants: Grant[];
  onMoveToApplied?: (id: string) => void;
  onGrantSaved: () => Promise<void> | void;
  onGrantTracked?: () => void;
}

const Discovery: React.FC<DiscoveryProps> = ({ grants, onGrantSaved, onGrantTracked }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // NEW: Agency Filter State
  const [selectedAgency, setSelectedAgency] = useState<string>('All');
  
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    runSearch("Texas"); 
    const existingIds = new Set(grants.map(g => g.funderId));
    setSavedIds(existingIds);
  }, [grants]);

  const runSearch = async (keyword: string) => {
    if (!keyword) return;
    setIsSearching(true);
    setError(null);
    setSelectedAgency('All'); // Reset the filter dropdown when a new search runs
    
    try {
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
          status: "applied",
          amount: 0,
          submission_date: new Date().toISOString().split('T')[0],
          application_status: "Submitted",
        })
      });

      if (response.ok) {
        setSavedIds(prev => new Set(prev).add(grant.grant_number));
        await onGrantSaved();
        onGrantTracked?.();
      } else {
        const errorData = await response.json();
        alert(`Error saving: ${errorData.detail}`);
      }
    } catch (err) {
      alert("Failed to communicate with database.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '2099-12-31') return 'Rolling / Open';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // NEW: Automatically extract all unique agencies from the current search results
  const uniqueAgencies = ['All', ...Array.from(new Set(searchResults.map(r => r.agency)))].sort();

  // NEW: Filter the table rows based on the drop-down selection
  const filteredResults = searchResults.filter(result => 
    selectedAgency === 'All' || result.agency === selectedAgency
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Opportunity Search</h1>
        <p className="text-zinc-500">Search the live federal database. Results are automatically sorted by urgent deadlines.</p>
      </header>

      {/* --- SEARCH BAR & FILTERS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Grants.gov (e.g., 'infrastructure', 'education', 'Texas')..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-12 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900 text-base"
            />
          </div>
          <button type="submit" disabled={isSearching} className="btn-primary whitespace-nowrap px-8">
            {isSearching ? 'Searching...' : 'Search Grants'}
          </button>
        </form>

        {/* --- AGENCY DROP-DOWN MENU --- */}
        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-3">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Filter by Agency:</span>
            <select 
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900 text-sm font-medium text-zinc-700 flex-1 max-w-xl cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              {uniqueAgencies.map(agency => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
            <span className="text-xs font-bold text-zinc-400 ml-auto">
              Showing {filteredResults.length} of {searchResults.length}
            </span>
          </div>
        )}

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
              {filteredResults.length === 0 && !isSearching ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-medium">No active grants found for this filter.</td>
                </tr>
              ) : (
                filteredResults.map((result, idx) => {
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
                        {/* HYPERLINK*/}
                        <a 
                          href={result.grants_gov_id 
                            ? `https://www.grants.gov/search-results-detail/${result.grants_gov_id}` 
                            : `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(result.grant_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer mb-1 text-base leading-tight block"
                          title="View Official Opportunity Details"
                        >
                          {result.title}
                        </a>
                        <div className="text-xs text-zinc-500 font-medium mt-1">
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
