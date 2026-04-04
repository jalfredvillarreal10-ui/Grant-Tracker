import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, PlusCircle, CheckCircle2, Filter } from 'lucide-react';
import type { Grant } from '../types/grant';

interface DiscoveryProps {
  grants: Grant[];
  onMoveToApplied?: (id: string) => void;
  onGrantSaved: () => Promise<void> | void;
  onGrantTracked?: () => void;
}

const PAGE_SIZE = 25;
const DEFAULT_CATEGORY = 'HL';

type CategoryOption = {
  label: string;
  value: string;
  count: number;
};

type SearchResult = {
  grant_number: string;
  title: string;
  agency: string;
  deadline: string;
  discovery_status: 'open' | 'upcoming' | 'other';
  grants_gov_id?: string;
  funder_portal_url?: string;
};

type SearchResponse = {
  results: SearchResult[];
  categories: CategoryOption[];
  total_results: number;
  current_page: number;
  page_size: number;
  total_pages: number;
};

const Discovery: React.FC<DiscoveryProps> = ({ grants, onGrantSaved, onGrantTracked }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORY);
  const [activeKeyword, setActiveKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    runSearch({ keyword: '', category: DEFAULT_CATEGORY, page: 1 });
  }, []);

  useEffect(() => {
    const existingIds = new Set(grants.map(g => g.funderId));
    setSavedIds(existingIds);
  }, [grants]);

  const runSearch = async ({
    keyword,
    category = 'All',
    page = 1,
  }: {
    keyword: string;
    category?: string;
    page?: number;
  }) => {
    setIsSearching(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) {
        params.set('keyword', keyword.trim());
      }
      if (category !== 'All') {
        params.set('category', category);
      }
      params.set('page', page.toString());
      params.set('page_size', PAGE_SIZE.toString());

      const response = await fetch(
        `http://localhost:8000/api/grantsgov/opportunities?${params.toString()}`
      );
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setSearchResults(data.results || []);
        setAvailableCategories(data.categories || []);
        setTotalResults(data.total_results || 0);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.total_pages || 1);
        setActiveKeyword(keyword.trim());
      } else {
        const errData = await response.json();
        setError(errData.detail || "Failed to fetch search results.");
        setSearchResults([]);
        setTotalResults(0);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch {
      setError("Failed to connect to backend server.");
      setSearchResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch({ keyword: searchQuery, category: selectedCategory, page: 1 });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    runSearch({ keyword: activeKeyword || searchQuery, category, page: 1 });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    runSearch({ keyword: activeKeyword, category: selectedCategory, page });
  };

  const handleSaveToPortfolio = async (grant: SearchResult) => {
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
          grants_gov_id: grant.grants_gov_id,
          funder_portal_url:
            grant.funder_portal_url ||
            (grant.grants_gov_id
              ? `https://www.grants.gov/search-results-detail/${grant.grants_gov_id}`
              : `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.grant_number)}`),
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
    } catch {
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

  const getStatusBadge = (status: SearchResult['discovery_status']) => {
    if (status === 'upcoming') {
      return {
        label: 'Upcoming',
        className: 'bg-blue-100 text-blue-800',
      };
    }

    return {
      label: 'Open',
      className: 'bg-yellow-400 text-yellow-900',
    };
  };

  const getVisiblePages = () => {
    const windowSize = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Opportunity Search</h1>
        <p className="text-zinc-500">Search the live federal database. Results are sorted by Close Date with the earliest close date at the top.</p>
      </header>

      {/* --- SEARCH BAR & FILTERS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Grants.gov or leave blank to browse open and upcoming grants..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-12 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900 text-base"
            />
          </div>
          <button type="submit" disabled={isSearching} className="btn-primary whitespace-nowrap px-8">
            {isSearching ? 'Searching...' : 'Search Grants'}
          </button>
        </form>

        {/* --- CATEGORY DROP-DOWN MENU --- */}
        {availableCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-3">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Filter by Category:</span>
            <select 
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-900 text-sm font-medium text-zinc-700 flex-1 max-w-xl cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              <option value="All">All</option>
              {availableCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-zinc-400 ml-auto">
              {totalResults.toLocaleString()} total results
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
              {searchResults.length === 0 && !isSearching ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-medium">No open or upcoming grants found for this filter.</td>
                </tr>
              ) : (
                searchResults.map((result, idx) => {
                  const isSaved = savedIds.has(result.grant_number);
                  const statusBadge = getStatusBadge(result.discovery_status);
                  return (
                    <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="p-4 whitespace-nowrap align-top font-medium text-zinc-900">
                        {formatDate(result.deadline)}
                      </td>
                      
                      <td className="p-4 align-top">
                        <span className={`${statusBadge.className} text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider`}>
                          {statusBadge.label}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-4 py-3 bg-zinc-50">
            <div className="text-sm text-zinc-500 font-medium">
              Page {currentPage} of {totalPages} • Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalResults)} of {totalResults.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isSearching}
                className="px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  disabled={isSearching}
                  className={`min-w-10 px-3 py-2 rounded-md text-sm font-semibold border ${
                    page === currentPage
                      ? 'bg-blue-900 border-blue-900 text-white'
                      : 'bg-white border-zinc-300 text-zinc-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isSearching}
                className="px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
