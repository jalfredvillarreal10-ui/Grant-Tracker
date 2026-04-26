import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, PlusCircle, CheckCircle2, Funnel, Star } from 'lucide-react';
import type { Grant } from '../types/grant';

interface DiscoveryProps {
  grants: Grant[];
  onMoveToApplied?: (id: string) => void;
  onGrantSaved: () => Promise<void> | void;
  onGrantTracked?: () => void;
}

const PAGE_SIZE = 25;
const DEFAULT_CATEGORY = 'HL';
const DEFAULT_AWARD_CEILING_RANGE = 'All';

const AWARD_CEILING_OPTIONS = [
  { label: 'All Ranges', value: 'All' },
  { label: '<$100,000', value: 'lt_100k' },
  { label: '$100k-$500k', value: '100k_500k' },
  { label: '$500k-$1M', value: '500k_1m' },
  { label: '>$1M', value: 'gt_1m' },
];

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
  award_floor?: number | null;
  award_ceiling?: number | null;
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

type FavoriteGrant = {
  id: number;
  grant_number: string;
  title: string;
  agency: string;
  deadline: string;
  amount: number;
  award_floor?: number | null;
  award_ceiling?: number | null;
  funder_portal_url?: string | null;
  grants_gov_id?: string | null;
};

type DiscoveryTab = 'results' | 'favorites' | 'tracked';

const normalizeGrantNumber = (value: string) => value.trim().toUpperCase();

const Discovery: React.FC<DiscoveryProps> = ({ grants, onGrantSaved, onGrantTracked }) => {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('results');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORY);
  const [selectedAwardCeilingRange, setSelectedAwardCeilingRange] = useState<string>(DEFAULT_AWARD_CEILING_RANGE);
  const [activeKeyword, setActiveKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteGrants, setFavoriteGrants] = useState<FavoriteGrant[]>([]);
  const [busyGrantIds, setBusyGrantIds] = useState<Set<string>>(new Set());
  const [opportunityDetailsById, setOpportunityDetailsById] = useState<Record<string, OpportunityDetails>>({});
  const [loadingDetailIds, setLoadingDetailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void runSearch({
      keyword: '',
      category: DEFAULT_CATEGORY,
      awardCeilingRange: DEFAULT_AWARD_CEILING_RANGE,
      page: 1,
    });
    void fetchFavorites();
  }, []);

  useEffect(() => {
    const existingIds = new Set(grants.map(g => normalizeGrantNumber(g.funderId)));
    setSavedIds(existingIds);
    setFavoriteIds(prev => new Set([...prev].filter(id => !existingIds.has(normalizeGrantNumber(id)))));
    setFavoriteGrants(prev => prev.filter(grant => !existingIds.has(normalizeGrantNumber(grant.grant_number))));
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

  const setGrantBusy = (grantNumber: string, isBusy: boolean) => {
    setBusyGrantIds(prev => {
      const next = new Set(prev);
      if (isBusy) {
        next.add(grantNumber);
      } else {
        next.delete(grantNumber);
      }
      return next;
    });
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/favorites');
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data: FavoriteGrant[] = await response.json();
      const trackedIds = new Set(grants.map(grant => normalizeGrantNumber(grant.funderId)));
      const filteredFavorites = data.filter(grant => !trackedIds.has(normalizeGrantNumber(grant.grant_number)));

      setFavoriteGrants(filteredFavorites);
      setFavoriteIds(new Set(filteredFavorites.map(grant => normalizeGrantNumber(grant.grant_number))));
    } catch (fetchError) {
      console.error('Failed to fetch favorites:', fetchError);
    }
  };

  const loadOpportunityDetails = async (grant: SearchResult | FavoriteGrant) => {
    const opportunityId = grant.grants_gov_id;
    if (!opportunityId) return {};

    if (opportunityDetailsById[opportunityId]) {
      return opportunityDetailsById[opportunityId];
    }

    const response = await fetch(`http://localhost:8000/api/grantsgov/opportunity/${opportunityId}`);
    if (!response.ok) {
      return {};
    }

    const details: OpportunityDetails = await response.json();
    setOpportunityDetailsById(prev => ({
      ...prev,
      [opportunityId]: details,
    }));
    return details;
  };

  const buildGrantPayload = (
    grant: SearchResult | FavoriteGrant,
    details: OpportunityDetails,
    status: 'available' | 'applied'
  ) => {
    const awardCeiling = details.award_ceiling ?? ('award_ceiling' in grant ? grant.award_ceiling ?? null : null);
    const awardFloor = details.award_floor ?? ('award_floor' in grant ? grant.award_floor ?? null : null);
    const amount = 'amount' in grant ? grant.amount || 0 : 0;
    const isTracking = status === 'applied';

    return {
      grant_number: grant.grant_number.trim(),
      title: grant.title,
      agency: grant.agency,
      deadline: grant.deadline || '2099-12-31',
      status,
      amount,
      award_floor: awardFloor,
      award_ceiling: awardCeiling,
      submission_date: isTracking ? new Date().toISOString().split('T')[0] : null,
      application_status: isTracking ? 'Submitted' : null,
      grants_gov_id: grant.grants_gov_id,
      funder_portal_url:
        grant.funder_portal_url ||
        (grant.grants_gov_id
          ? `https://www.grants.gov/search-results-detail/${grant.grants_gov_id}`
          : `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.grant_number)}`),
    };
  };

  const runSearch = async ({
    keyword,
    category = 'All',
    awardCeilingRange = 'All',
    page = 1,
  }: {
    keyword: string;
    category?: string;
    awardCeilingRange?: string;
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
      if (awardCeilingRange !== 'All') {
        params.set('award_ceiling_range', awardCeilingRange);
      }
      params.set('page', page.toString());
      params.set('page_size', PAGE_SIZE.toString());

      const response = await fetch(
        `http://localhost:8000/api/grantsgov/opportunities?${params.toString()}`
      );
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setSearchResults(data.results || []);
        setOpportunityDetailsById(prev => {
          const next = { ...prev };
          (data.results || []).forEach(result => {
            if (!result.grants_gov_id) return;
            if (result.award_floor == null && result.award_ceiling == null) return;
            next[result.grants_gov_id] = {
              award_floor: result.award_floor,
              award_ceiling: result.award_ceiling,
            };
          });
          return next;
        });
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
    void runSearch({
      keyword: searchQuery,
      category: selectedCategory,
      awardCeilingRange: selectedAwardCeilingRange,
      page: 1,
    });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    void runSearch({
      keyword: activeKeyword || searchQuery,
      category,
      awardCeilingRange: selectedAwardCeilingRange,
      page: 1,
    });
  };

  const handleAwardCeilingChange = (awardCeilingRange: string) => {
    setSelectedAwardCeilingRange(awardCeilingRange);
    void runSearch({
      keyword: activeKeyword || searchQuery,
      category: selectedCategory,
      awardCeilingRange,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    void runSearch({
      keyword: activeKeyword,
      category: selectedCategory,
      awardCeilingRange: selectedAwardCeilingRange,
      page,
    });
  };

  const handleSaveToTracking = async (
    grant: SearchResult | FavoriteGrant,
    options?: { navigateToLifecycle?: boolean }
  ) => {
    const normalizedGrantNumber = normalizeGrantNumber(grant.grant_number);
    if (savedIds.has(normalizedGrantNumber)) return;

    setGrantBusy(grant.grant_number, true);
    try {
      const opportunityDetails = await loadOpportunityDetails(grant);
      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGrantPayload(grant, opportunityDetails, 'applied'))
      });

      if (response.ok) {
        setSavedIds(prev => new Set(prev).add(normalizedGrantNumber));
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(normalizedGrantNumber);
          return next;
        });
        setFavoriteGrants(prev => prev.filter(favorite => favorite.grant_number !== grant.grant_number));
        await onGrantSaved();
        if (options?.navigateToLifecycle) {
          onGrantTracked?.();
        }
      } else {
        const errorData = await response.json();
        alert(`Error saving: ${errorData.detail}`);
      }
    } catch {
      alert('Failed to communicate with database.');
    } finally {
      setGrantBusy(grant.grant_number, false);
    }
  };

  const handleToggleFavorite = async (grant: SearchResult) => {
    const normalizedGrantNumber = normalizeGrantNumber(grant.grant_number);
    if (savedIds.has(normalizedGrantNumber)) return;

    const isFavorite = favoriteIds.has(normalizedGrantNumber);
    setGrantBusy(grant.grant_number, true);

    try {
      if (isFavorite) {
        const response = await fetch(`http://localhost:8000/api/favorites/${encodeURIComponent(grant.grant_number)}`, {
          method: 'DELETE',
        });

        if (!response.ok && response.status !== 404) {
          throw new Error('Failed to remove favorite');
        }

        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(normalizedGrantNumber);
          return next;
        });
        setFavoriteGrants(prev => prev.filter(favorite => favorite.grant_number !== grant.grant_number));
        return;
      }

      const opportunityDetails = await loadOpportunityDetails(grant);
      const response = await fetch('http://localhost:8000/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGrantPayload(grant, opportunityDetails, 'available'))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add favorite');
      }

      await fetchFavorites();
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Failed to update favorites.';
      alert(message);
    } finally {
      setGrantBusy(grant.grant_number, false);
    }
  };

  const handleRemoveFavorite = async (grantNumber: string) => {
    const normalizedGrantNumber = normalizeGrantNumber(grantNumber);
    setGrantBusy(grantNumber, true);
    try {
      const response = await fetch(`http://localhost:8000/api/favorites/${encodeURIComponent(grantNumber)}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove favorite');
      }

      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(normalizedGrantNumber);
        return next;
      });
      setFavoriteGrants(prev => prev.filter(grant => grant.grant_number !== grantNumber));
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Failed to remove favorite.';
      alert(message);
    } finally {
      setGrantBusy(grantNumber, false);
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
    if (amount == null || amount === 0) return 'Not provided';
    return `$${amount.toLocaleString()}`;
  };

  const trackedGrants = [...grants].sort((a, b) => {
    const dateA = new Date(a.submissionDate ?? a.deadline ?? '9999-12-31').getTime();
    const dateB = new Date(b.submissionDate ?? b.deadline ?? '9999-12-31').getTime();
    return dateA - dateB;
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="mb-1 text-3xl font-bold text-app-primary">Opportunity Search</h1>
        <p className="max-w-3xl text-app-secondary">
          Search the live federal database, shortlist promising leads, and move approved choices into active tracking.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-app-border bg-app-card p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] transition ${
              activeTab === 'results'
                ? 'bg-laredo-navy text-white'
                : 'text-app-secondary hover:bg-app-muted'
            }`}
          >
            Search Results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] transition ${
              activeTab === 'favorites'
                ? 'bg-yellow-400 text-yellow-950'
                : 'text-app-secondary hover:bg-app-muted'
            }`}
          >
            Favorites
            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px]">
              {favoriteGrants.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tracked')}
            className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] transition ${
              activeTab === 'tracked'
                ? 'bg-emerald-700 text-white'
                : 'text-app-secondary hover:bg-app-muted'
            }`}
          >
            Tracking
            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px]">
              {trackedGrants.length}
            </span>
          </button>
        </div>

        {activeTab === 'results' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-[48%] text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Grants.gov or leave blank to browse open and upcoming grants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 pl-12 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="whitespace-nowrap rounded-xl bg-laredo-navy px-8 py-3 font-bold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80 md:self-stretch dark:bg-laredo-gold-new dark:text-black"
                >
                  {isSearching ? 'Searching...' : 'Search Grants'}
                </button>
              </form>

              {(availableCategories.length > 0 || AWARD_CEILING_OPTIONS.length > 0) && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Funnel className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Filter by Category</span>
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-auto min-w-[170px] max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors hover:bg-slate-100 focus:border-slate-400"
                    >
                      <option value="All">All</option>
                      {availableCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <div className="hidden h-8 w-px bg-slate-200 lg:block" />
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Award Ceiling</span>
                    <select
                      value={selectedAwardCeilingRange}
                      onChange={(e) => handleAwardCeilingChange(e.target.value)}
                      className="min-w-[170px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors hover:bg-slate-100 focus:border-slate-400"
                    >
                      {AWARD_CEILING_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:ml-auto">
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

            <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-app-border bg-app-muted text-xs uppercase tracking-wider text-app-secondary">
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
                        <td colSpan={7} className="p-8 text-center font-medium text-app-secondary">
                          No open or upcoming grants found for this filter.
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((result, idx) => {
                        const isSaved = savedIds.has(result.grant_number);
                        const isFavorite = favoriteIds.has(result.grant_number);
                        const isBusy = busyGrantIds.has(result.grant_number);
                        const statusBadge = getStatusBadge(result.discovery_status);
                        const opportunityDetails = result.grants_gov_id ? opportunityDetailsById[result.grants_gov_id] : undefined;
                        const isDetailsLoading = result.grants_gov_id ? loadingDetailIds.has(result.grants_gov_id) : false;

                        return (
                          <tr key={idx} className="border-b border-app-border transition-colors hover:bg-app-muted">
                            <td className="whitespace-nowrap p-4 align-top font-medium text-app-primary">
                              {formatDate(result.deadline)}
                            </td>
                            <td className="p-4 align-top">
                              <span className={`${statusBadge.className} rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="p-4 align-top">
                              <div className="mb-1 flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => void handleToggleFavorite(result)}
                                  disabled={isSaved || isBusy}
                                  className={`mt-0.5 rounded-full p-1 transition ${
                                    isSaved
                                      ? 'cursor-not-allowed text-app-secondary-muted/40'
                                      : isFavorite
                                        ? 'text-yellow-500 hover:text-yellow-600'
                                        : 'text-app-secondary-muted/70 hover:text-yellow-500'
                                  }`}
                                  title={isSaved ? 'Tracked grants cannot be favorited' : isFavorite ? 'Remove from starred leads' : 'Add to starred leads'}
                                >
                                  <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                                </button>
                                <div>
                                  <a
                                    href={result.grants_gov_id
                                      ? `https://www.grants.gov/search-results-detail/${result.grants_gov_id}`
                                      : `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(result.grant_number)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mb-1 block cursor-pointer text-base font-bold leading-tight text-blue-700 hover:text-app-primary hover:underline"
                                    title="View Official Opportunity Details"
                                  >
                                    {result.title}
                                  </a>
                                  <div className="mt-1 text-xs font-medium text-app-secondary">
                                    <span className="font-bold text-app-primary">Number:</span> {result.grant_number}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-top text-sm text-app-primary">
                              {result.agency}
                            </td>
                            <td className="whitespace-nowrap p-4 align-top text-sm font-semibold text-app-primary">
                              {isDetailsLoading ? 'Loading...' : formatCurrency(opportunityDetails?.award_floor)}
                            </td>
                            <td className="whitespace-nowrap p-4 align-top text-sm font-semibold text-app-primary">
                              {isDetailsLoading ? 'Loading...' : formatCurrency(opportunityDetails?.award_ceiling)}
                            </td>
                            <td className="p-4 align-top text-center">
                              <button
                                onClick={() => void handleSaveToTracking(result, { navigateToLifecycle: true })}
                                disabled={isSaved || isBusy}
                                className={`flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-bold uppercase transition-all ${
                                  isSaved
                                    ? 'cursor-not-allowed bg-app-soft/50 text-app-secondary-muted/80'
                                    : 'border border-app-primary bg-app-card text-app-primary hover:bg-app-primary hover:text-white'
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
                <div className="flex items-center justify-between gap-4 border-t border-app-border bg-app-muted px-4 py-3">
                  <div className="text-sm font-medium text-app-secondary">
                    Page {currentPage} of {totalPages} • Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalResults)} of {totalResults.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isSearching}
                      className="rounded-md border border-app-border bg-app-card px-3 py-2 text-sm font-semibold text-app-primary disabled:cursor-not-allowed disabled:opacity-50"
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
                            ? 'border-app-primary bg-app-primary text-white'
                            : 'border-app-border bg-app-card text-app-primary'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isSearching}
                      className="rounded-md border border-app-border bg-app-card px-3 py-2 text-sm font-semibold text-app-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'favorites' && (
          <div className="flex flex-col gap-4">
            {favoriteGrants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-app-border bg-app-muted p-10 text-center text-app-secondary">
                No starred leads yet. Use the star icon in Search Results to shortlist grants before tracking them.
              </div>
            ) : (
              favoriteGrants.map((grant) => {
                const isBusy = busyGrantIds.has(grant.grant_number);
                const grantUrl =
                  grant.grants_gov_id
                    ? `https://www.grants.gov/search-results-detail/${grant.grants_gov_id}`
                    : grant.funder_portal_url ||
                      `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.grant_number)}`;
                return (
                  <div
                    key={grant.grant_number}
                    className="rounded-2xl border border-app-border bg-app-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:grid lg:min-h-[132px] lg:grid-cols-[minmax(0,1fr)_224px] lg:items-start">
                      <div className="flex min-w-0 flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          Starred
                          </div>
                          <a
                            href={grantUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[1.7rem] font-bold leading-tight text-blue-700 hover:text-app-primary hover:underline"
                            title="View Official Opportunity Details"
                          >
                            {grant.title}
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-app-secondary">
                          <span><span className="font-bold text-app-primary">Number:</span> {grant.grant_number}</span>
                          <span><span className="font-bold text-app-primary">Agency:</span> {grant.agency}</span>
                          <span><span className="font-bold text-app-primary">Deadline:</span> {formatDate(grant.deadline)}</span>
                          <span><span className="font-bold text-app-primary">Award Ceiling:</span> {formatCurrency(grant.award_ceiling ?? grant.amount)}</span>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-3 lg:w-[224px]">
                        <button
                          type="button"
                          onClick={() => void handleRemoveFavorite(grant.grant_number)}
                          disabled={isBusy}
                          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-app-border bg-app-card px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-app-secondary transition hover:bg-app-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveToTracking(grant)}
                          disabled={isBusy}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-laredo-navy px-2 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80 dark:bg-laredo-gold-new dark:text-black"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Move to Tracking
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'tracked' && (
          <div className="flex flex-col gap-4">
            {trackedGrants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-app-border bg-app-muted p-10 text-center text-app-secondary">
                No tracked grants yet. Move a grant into tracking from Search Results or Favorites.
              </div>
            ) : (
              trackedGrants.map((grant) => {
                const grantUrl =
                  grant.grantsGovId
                    ? `https://www.grants.gov/search-results-detail/${grant.grantsGovId}`
                    : grant.funderPortalUrl ||
                      `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.funderId)}`;

                return (
                  <div
                    key={grant.id}
                    className="rounded-2xl border border-app-border bg-app-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:grid lg:min-h-[132px] lg:grid-cols-[minmax(0,1fr)_224px] lg:items-start">
                      <div className="flex min-w-0 flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            {grant.status}
                          </div>
                          <a
                            href={grantUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[1.7rem] font-bold leading-tight text-blue-700 hover:text-app-primary hover:underline"
                            title="View Official Opportunity Details"
                          >
                            {grant.title}
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-app-secondary">
                          <span><span className="font-bold text-app-primary">Number:</span> {grant.funderId}</span>
                          <span><span className="font-bold text-app-primary">Agency:</span> {grant.source}</span>
                          <span><span className="font-bold text-app-primary">Deadline:</span> {formatDate(grant.deadline ?? '')}</span>
                          <span><span className="font-bold text-app-primary">Submitted:</span> {formatDate(grant.submissionDate ?? '')}</span>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-3 lg:w-[224px]">
                        <button
                          type="button"
                          onClick={() => onGrantTracked?.()}
                          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
                        >
                          Open Lifecycle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
