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

type OpportunityDetails = {
  award_floor?: number | null;
  award_ceiling?: number | null;
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
  const [opportunityDetailsById, setOpportunityDetailsById] = useState<Record<string, OpportunityDetails>>({});
  const [loadingDetailIds, setLoadingDetailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    runSearch({ keyword: '', category: DEFAULT_CATEGORY, page: 1 });
  }, []);

  useEffect(() => {
    const existingIds = new Set(grants.map(g => g.funderId));
    setSavedIds(existingIds);
  }, [grants]);

  useEffect(() => {
    const visibleOpportunityIds = searchResults
      .map(result => result.grants_gov_id)
      .filter((id): id is string => Boolean(id))
      .filter(id => !(id in opportunityDetailsById) && !loadingDetailIds.has(id));

    if (visibleOpportunityIds.length === 0) return;

    setLoadingDetailIds(prev => {
      const next = new Set(prev);
      visibleOpportunityIds.forEach(id => next.add(id));
      return next;
    });

    void Promise.allSettled(
      visibleOpportunityIds.map(async (id) => {
        const response = await fetch(`http://localhost:8000/api/grantsgov/opportunity/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch details for ${id}`);
        }

        const details: OpportunityDetails = await response.json();
        setOpportunityDetailsById(prev => ({
          ...prev,
          [id]: details,
        }));
      })
    ).finally(() => {
      setLoadingDetailIds(prev => {
        const next = new Set(prev);
        visibleOpportunityIds.forEach(id => next.delete(id));
        return next;
      });
    });
  }, [searchResults, opportunityDetailsById, loadingDetailIds]);

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
        setError(errData.detail || 'Failed to fetch search results.');
        setSearchResults([]);
        setTotalResults(0);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch {
      setError('Failed to connect to backend server.');
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
      let opportunityDetails: OpportunityDetails = {};

      if (grant.grants_gov_id) {
        const detailsResponse = await fetch(`http://localhost:8000/api/grantsgov/opportunity/${grant.grants_gov_id}`);
        if (detailsResponse.ok) {
          opportunityDetails = await detailsResponse.json();
        }
      }

      const awardCeiling = opportunityDetails.award_ceiling ?? null;
      const awardFloor = opportunityDetails.award_floor ?? null;

      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_number: grant.grant_number,
          title: grant.title,
          agency: grant.agency,
          deadline: grant.deadline || '2099-12-31',
          status: 'applied',
          amount: awardCeiling ?? 0,
          award_floor: awardFloor,
          award_ceiling: awardCeiling,
          submission_date: new Date().toISOString().split('T')[0],
          application_status: 'Submitted',
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
      alert('Failed to communicate with database.');
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

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return 'Not provided';
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="mb-1 text-3xl font-bold text-blue-900">Opportunity Search</h1>
        <p className="max-w-3xl text-zinc-500">
          Search the live federal database. Results are sorted by Close Date with the earliest close date at the top.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-[48%] text-zinc-400" />
              <input
                type="text"
                placeholder="Search Grants.gov or leave blank to browse open and upcoming grants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 pl-12 text-base text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-900 focus:bg-white"
              />
            </div>
            <button type="submit" disabled={isSearching} className="btn-primary whitespace-nowrap px-8 md:self-stretch">
              {isSearching ? 'Searching...' : 'Search Grants'}
            </button>
          </form>

          {availableCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
              <Filter className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">Filter by Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 outline-none transition-colors hover:bg-zinc-100 focus:border-blue-900 md:max-w-xl"
              >
                <option value="All">All</option>
                {availableCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <span className="text-xs font-bold text-zinc-400 md:ml-auto">
                {totalResults.toLocaleString()} total results
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-600">
                  <th className="w-32 p-4 font-bold">Close Date</th>
                  <th className="w-24 p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Title & Opportunity Number</th>
                  <th className="w-1/4 p-4 font-bold">Agency</th>
                  <th className="w-36 p-4 font-bold">Award Floor</th>
                  <th className="w-36 p-4 font-bold">Award Ceiling</th>
                  <th className="w-32 p-4 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.length === 0 && !isSearching ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-medium text-zinc-500">
                      No open or upcoming grants found for this filter.
                    </td>
                  </tr>
                ) : (
                  searchResults.map((result, idx) => {
                    const isSaved = savedIds.has(result.grant_number);
                    const statusBadge = getStatusBadge(result.discovery_status);
                    const opportunityDetails = result.grants_gov_id ? opportunityDetailsById[result.grants_gov_id] : undefined;
                    const isDetailsLoading = result.grants_gov_id ? loadingDetailIds.has(result.grants_gov_id) : false;

                    return (
                      <tr key={idx} className="border-b border-zinc-100 transition-colors hover:bg-zinc-50">
                        <td className="whitespace-nowrap p-4 align-top font-medium text-zinc-900">
                          {formatDate(result.deadline)}
                        </td>
                        <td className="p-4 align-top">
                          <span className={`${statusBadge.className} rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="p-4 align-top">
                          <a
                            href={result.grants_gov_id
                              ? `https://www.grants.gov/search-results-detail/${result.grants_gov_id}`
                              : `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(result.grant_number)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-1 block cursor-pointer text-base font-bold leading-tight text-blue-700 hover:text-blue-900 hover:underline"
                            title="View Official Opportunity Details"
                          >
                            {result.title}
                          </a>
                          <div className="mt-1 text-xs font-medium text-zinc-500">
                            <span className="font-bold text-zinc-700">Number:</span> {result.grant_number}
                          </div>
                        </td>
                        <td className="p-4 align-top text-sm text-zinc-700">
                          {result.agency}
                        </td>
                        <td className="whitespace-nowrap p-4 align-top text-sm font-semibold text-zinc-700">
                          {isDetailsLoading ? 'Loading...' : formatCurrency(opportunityDetails?.award_floor)}
                        </td>
                        <td className="whitespace-nowrap p-4 align-top text-sm font-semibold text-zinc-700">
                          {isDetailsLoading ? 'Loading...' : formatCurrency(opportunityDetails?.award_ceiling)}
                        </td>
                        <td className="p-4 align-top text-center">
                          <button
                            onClick={() => handleSaveToPortfolio(result)}
                            disabled={isSaved}
                            className={`flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-bold uppercase transition-all ${
                              isSaved
                                ? 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                                : 'border border-blue-900 bg-white text-blue-900 hover:bg-blue-900 hover:text-white'
                            }`}
                          >
                            {isSaved ? (
                              <><CheckCircle2 className="h-3 w-3" /> Tracked</>
                            ) : (
                              <><PlusCircle className="h-3 w-3" /> Track</>
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
            <div className="flex items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-sm font-medium text-zinc-500">
                Page {currentPage} of {totalPages} â€¢ Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalResults)} of {totalResults.toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isSearching}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                {getVisiblePages().map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    disabled={isSearching}
                    className={`min-w-10 rounded-md border px-3 py-2 text-sm font-semibold ${
                      page === currentPage
                        ? 'border-blue-900 bg-blue-900 text-white'
                        : 'border-zinc-300 bg-white text-zinc-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isSearching}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discovery;
