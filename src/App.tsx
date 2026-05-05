import { useState, useEffect } from 'react'
import { Bell, ChevronDown, LogOut, RefreshCw, Sun, Moon, Trash2, TrendingUp } from 'lucide-react'
import Login from './components/Login'
import Discovery from './pages/Discovery'
import Lifecycle from './pages/Lifecycle'
import Portfolio from './pages/Portfolio'
import Reporting from './pages/Reporting'
import type { Grant, GrantStatus } from './types/grant'

type Page = 'discovery' | 'lifecycle' | 'portfolio' | 'reporting';

type BackendGrant = {
  id: number;
  grant_number: string;
  title: string;
  agency: Grant['source'];
  amount?: number | null;
  award_floor?: number | null;
  award_ceiling?: number | null;
  status: GrantStatus;
  deadline?: string | null;
  submission_date?: string | null;
  expected_notification_date?: string | null;
  poc_name?: string | null;
  poc_email?: string | null;
  internal_lead?: string | null;
  application_status?: Grant['applicationStatus'];
  rejection_reason?: Grant['rejectionReason'];
  feedback_summary?: string | null;
  denial_date?: string | null;
  expiration_date?: string | null;
  spent_amount?: number | null;
  compliance_category?: Grant['complianceCategory'];
  program_manager?: string | null;
  next_report_due?: string | null;
  onboarding_date?: string | null;
  is_extended?: boolean | null;
  renewal_status?: Grant['renewalStatus'] | null;
  funder_portal_url?: string | null;
  grants_gov_id?: string | null;
};

type FavoriteGrant = BackendGrant;
type GrantPayload = {
  grant_number: string;
  title: string;
  agency: Grant['source'];
  deadline?: string;
  amount: number;
  award_floor?: number;
  award_ceiling?: number;
  status: GrantStatus;
  submission_date?: string;
  expected_notification_date?: string;
  poc_name?: string;
  poc_email?: string;
  internal_lead?: string;
  application_status?: Grant['applicationStatus'];
  rejection_reason?: Grant['rejectionReason'];
  feedback_summary?: string;
  denial_date?: string;
  expiration_date?: string;
  spent_amount: number;
  compliance_category?: Grant['complianceCategory'];
  program_manager?: string;
  next_report_due?: string;
  onboarding_date?: string;
  is_extended: boolean;
  renewal_status: Grant['renewalStatus'];
  funder_portal_url?: string;
  grants_gov_id?: string;
};

function optionalString(value?: string | null) {
  return value ?? undefined;
}

function mapBackendGrant(g: BackendGrant, idPrefix = ''): Grant {
  return {
    id: `${idPrefix}${g.id}`,
    funderId: g.grant_number,
    title: g.title,
    source: g.agency,
    amount: g.amount || 0,
    awardFloor: g.award_floor ?? undefined,
    awardCeiling: g.award_ceiling ?? undefined,
    status: g.status,
    deadline: optionalString(g.deadline),
    submissionDate: optionalString(g.submission_date),
    expectedNotificationDate: optionalString(g.expected_notification_date),
    pocName: optionalString(g.poc_name),
    pocEmail: optionalString(g.poc_email),
    internalLead: optionalString(g.internal_lead),
    applicationStatus: g.application_status,
    rejectionReason: g.rejection_reason,
    feedbackSummary: optionalString(g.feedback_summary),
    denialDate: optionalString(g.denial_date),
    expirationDate: optionalString(g.expiration_date),
    spentAmount: g.spent_amount || 0,
    remainingAmount: (g.amount || 0) - (g.spent_amount || 0),
    complianceCategory: g.compliance_category,
    programManager: optionalString(g.program_manager),
    nextReportDue: optionalString(g.next_report_due),
    onboardingDate: optionalString(g.onboarding_date),
    isExtended: !!g.is_extended,
    renewalStatus: g.renewal_status || 'None',
    funderPortalUrl: optionalString(g.funder_portal_url),
    grantsGovId: optionalString(g.grants_gov_id),
  };
}

function toGrantPayload(grant: Grant, options?: { deadlineFallback?: string }): GrantPayload {
  return {
    grant_number: grant.funderId,
    title: grant.title,
    agency: grant.source,
    deadline: grant.deadline || options?.deadlineFallback,
    amount: grant.amount,
    award_floor: grant.awardFloor,
    award_ceiling: grant.awardCeiling,
    status: grant.status,
    submission_date: grant.submissionDate,
    expected_notification_date: grant.expectedNotificationDate,
    poc_name: grant.pocName,
    poc_email: grant.pocEmail,
    internal_lead: grant.internalLead,
    application_status: grant.applicationStatus,
    rejection_reason: grant.rejectionReason,
    feedback_summary: grant.feedbackSummary,
    denial_date: grant.denialDate,
    expiration_date: grant.expirationDate,
    spent_amount: grant.spentAmount || 0,
    compliance_category: grant.complianceCategory,
    program_manager: grant.programManager,
    next_report_due: grant.nextReportDue,
    onboarding_date: grant.onboardingDate,
    is_extended: !!grant.isExtended,
    renewal_status: grant.renewalStatus || 'None',
    funder_portal_url: grant.funderPortalUrl,
    grants_gov_id: grant.grantsGovId,
  };
}

type OpportunityDetailsResponse = {
  award_floor?: number | null;
  award_ceiling?: number | null;
};

type NotificationHistoryItem = {
  id: number;
  grant_id: number;
  grant_number: string;
  title: string;
  event_kind: 'expiration' | 'deadline';
  event_date?: string | null;
  notice_type: string;
  recipients: string[];
  subject: string;
  body: string;
  expiration_date?: string | null;
  days_until_event: number;
  days_until_expiration: number;
  archived: boolean;
  sent_on: string;
  sent_at: string;
};

const AUTH_STORAGE_KEY = 'lhgp-auth-email';

function differenceInDaysFromToday(value?: string) {
  if (!value) return null;

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const target = new Date(`${value}T00:00:00`)

  if (Number.isNaN(target.getTime())) {
    return null
  }

  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((targetUtc - todayUtc) / 86400000)
}

function formatShortDate(value?: string) {
  if (!value) return 'No date'

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function getPrimaryNotificationDate(grant: Grant) {
  if (grant.status === 'approved') {
    return grant.expirationDate
  }

  if (grant.status === 'available' || grant.status === 'applied') {
    return grant.deadline
  }

  return undefined
}

function getNotificationEventLabel(eventKind: 'expiration' | 'deadline') {
  return eventKind === 'deadline' ? 'Closes' : 'Expires'
}

function App() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY) || '')
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem(AUTH_STORAGE_KEY)))
  const [activePage, setActivePage] = useState<Page>('discovery')
  const [grants, setGrants] = useState<Grant[]>([])
  const [favoriteGrants, setFavoriteGrants] = useState<Grant[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isNotificationJobRunning, setIsNotificationJobRunning] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (isAuthenticated && userEmail) {
      localStorage.setItem(AUTH_STORAGE_KEY, userEmail)
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [isAuthenticated, userEmail])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Fetch live grants from Python backend
  const fetchGrants = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('http://localhost:8000/api/grants');
      if (response.ok) {
        const dbGrants: BackendGrant[] = await response.json();
        
        // Map backend database schema to your rich frontend UI schema
        const mappedGrants = dbGrants.map((g) => mapBackendGrant(g));
        
        setGrants(mappedGrants);

        const grantsMissingAwardData = mappedGrants.filter(
          (grant) => grant.grantsGovId && grant.awardCeiling == null
        );

        if (grantsMissingAwardData.length > 0) {
          const hydratedGrants = await Promise.all(
            grantsMissingAwardData.map(async (grant) => {
              try {
                const detailResponse = await fetch(`http://localhost:8000/api/grantsgov/opportunity/${grant.grantsGovId}`);
                if (!detailResponse.ok) return null;

                const details: OpportunityDetailsResponse = await detailResponse.json();
                if (details.award_ceiling == null && details.award_floor == null) return null;

                const updatedGrant: Grant = {
                  ...grant,
                  amount: grant.amount,
                  awardFloor: details.award_floor ?? grant.awardFloor,
                  awardCeiling: details.award_ceiling ?? grant.awardCeiling,
                  remainingAmount:
                    grant.amount - (grant.spentAmount || 0),
                };

                const saveResponse = await fetch(`http://localhost:8000/api/grants/${grant.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(toGrantPayload(updatedGrant))
                });

                return saveResponse.ok ? updatedGrant.id : null;
              } catch (error) {
                console.error('Failed to hydrate grant award data:', error);
                return null;
              }
            })
          );

          if (hydratedGrants.some(Boolean)) {
            const refreshedResponse = await fetch('http://localhost:8000/api/grants');
            if (refreshedResponse.ok) {
              const refreshedDbGrants: BackendGrant[] = await refreshedResponse.json();
              setGrants(refreshedDbGrants.map((g) => mapBackendGrant(g)));
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch grants:", error);
    } finally {
      setIsRefreshing(false)
    }
  }

  const saveGrantUpdate = async (grant: Grant) => {
    try {
      const response = await fetch(`http://localhost:8000/api/grants/${grant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toGrantPayload(grant))
      });
      if (response.ok) {
        setGrants((prev) =>
          prev.map((existingGrant) =>
            existingGrant.id === grant.id ? grant : existingGrant
          )
        )
        await fetchGrants();
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to update grant:", error);
      return false
    }
  }

  const createGrant = async (grant: Grant) => {
    try {
      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toGrantPayload(grant, { deadlineFallback: '2099-12-31' }))
      })

      if (response.ok) {
        await fetchGrants()
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to create grant:', error)
      return false
    }
  }

  // Fetch when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchGrants();
      fetchNotificationHistory()
      fetchFavorites()
    }
  }, [isAuthenticated]);


  const handleLogin = (email: string) => {
    setUserEmail(email)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserEmail('')
  }

  const clearGrantData = async () => {
    const confirmed = window.confirm('Clear all saved grant data from the local database? This cannot be undone.')
    if (!confirmed) return

    try {
      const response = await fetch('http://localhost:8000/api/grants', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear grant data')
      }

      setGrants([])
      await fetchGrants()
    } catch (error) {
      console.error('Failed to clear grant data:', error)
      window.alert('Failed to clear grant data.')
    }
  }

  const triggerNotificationCheck = async () => {
    setIsNotificationJobRunning(true)
    setNotificationError('')

    try {
      const response = await fetch('http://localhost:8000/api/notifications/expiration-check', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to run notification check')
      }

      await fetchGrants()
      await fetchNotificationHistory()
      await fetchFavorites()
    } catch (error) {
      console.error('Failed to run notification check:', error)
      setNotificationError('Notification check failed. Confirm the FastAPI server is running and APScheduler is installed.')
    } finally {
      setIsNotificationJobRunning(false)
    }
  }

  const fetchNotificationHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/history')
      if (!response.ok) {
        throw new Error('Failed to fetch notification history')
      }

      const history: NotificationHistoryItem[] = await response.json()
      setNotificationHistory(history)
    } catch (error) {
      console.error('Failed to fetch notification history:', error)
    }
  }

  const fetchFavorites = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/favorites')
      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }

      const dbFavorites: FavoriteGrant[] = await response.json()
      const mappedFavorites = dbFavorites.map((g) => mapBackendGrant(g, 'favorite-'))

      setFavoriteGrants(mappedFavorites)
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    }
  }

  const updateGrantStatus = async (
    id: string,
    status: GrantStatus,
    rejectionReason?: Grant['rejectionReason'],
    feedbackSummary?: string
  ) => {
    const grant = grants.find(g => g.id === id);
    if (grant) {
      const updatedGrant: Grant = {
        ...grant,
        status,
        applicationStatus: status === 'approved' ? undefined : grant.applicationStatus,
        rejectionReason,
        feedbackSummary,
        denialDate: (status === 'denied' || status === 'withdrawn') ? new Date().toISOString().split('T')[0] : undefined,
        onboardingDate: status === 'approved' ? (grant.onboardingDate || new Date().toISOString().split('T')[0]) : grant.onboardingDate,
      };
      await saveGrantUpdate(updatedGrant);
    }
  }

  const createRenewalGrant = async (grant: Grant) => {
    const today = new Date().toISOString().split('T')[0]
    const renewalGrantNumber = `${grant.funderId}-RENEWAL-${grant.id}-${new Date().getFullYear()}`

    const response = await fetch('http://localhost:8000/api/grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_number: renewalGrantNumber,
        title: `${grant.title} Renewal Cycle`,
        agency: grant.source,
        deadline: grant.expirationDate || grant.deadline || '2099-12-31',
        amount: grant.amount,
        award_floor: grant.awardFloor,
        award_ceiling: grant.awardCeiling,
        status: 'applied',
        submission_date: today,
        expected_notification_date: grant.expirationDate || null,
        internal_lead: grant.internalLead,
        application_status: 'Submitted',
        rejection_reason: null,
        feedback_summary: null,
        denial_date: null,
        expiration_date: null,
        spent_amount: 0,
        compliance_category: grant.complianceCategory,
        program_manager: grant.programManager,
        next_report_due: null,
        onboarding_date: null,
        is_extended: false,
        renewal_status: 'None',
        poc_name: grant.pocName,
        poc_email: grant.pocEmail,
        funder_portal_url: grant.funderPortalUrl,
        grants_gov_id: grant.grantsGovId,
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create renewal record')
    }
  }

  const handleAction = async (id: string, action: string) => {
    const grant = grants.find(g => g.id === id)
    if (!grant) return

    if (action === 'renew') {
      if (grant.renewalStatus === 'Initiated') {
        setActivePage('lifecycle')
        return
      }
      const updatedGrant: Grant = {
        ...grant,
        renewalStatus: 'Initiated',
        isExtended: true,
      }
      await saveGrantUpdate(updatedGrant)
      await createRenewalGrant(updatedGrant)
      setActivePage('lifecycle')
      return
    }

    if (action === 'close') {
      await saveGrantUpdate({
        ...grant,
        status: 'closed',
      })
      return
    }
  }

  const pipelineDeadlineGrants = [...grants, ...favoriteGrants]
    .map((grant) => ({
      grant,
      daysUntilEvent: differenceInDaysFromToday(grant.deadline),
    }))
    .filter(
      (item) =>
        (item.grant.status === 'available' || item.grant.status === 'applied') &&
        item.daysUntilEvent != null &&
        item.daysUntilEvent <= 7
    )
    .filter((item, index, items) => items.findIndex((candidate) => candidate.grant.funderId === item.grant.funderId) === index)
    .sort((a, b) => (a.daysUntilEvent ?? 9999) - (b.daysUntilEvent ?? 9999))

  const actionableDeadlineGrants = pipelineDeadlineGrants.filter(({ daysUntilEvent }) =>
    daysUntilEvent != null && (daysUntilEvent === 7 || daysUntilEvent === 1 || daysUntilEvent <= 0)
  )

  const awardExpirationGrants = grants
    .map((grant) => ({
      grant,
      daysUntilEvent: differenceInDaysFromToday(grant.expirationDate),
    }))
    .filter(
      (item) =>
        item.grant.status === 'approved' &&
        item.daysUntilEvent != null &&
        item.daysUntilEvent <= 7
    )
    .sort((a, b) => (a.daysUntilEvent ?? 9999) - (b.daysUntilEvent ?? 9999))

  const actionableNotificationGrants = awardExpirationGrants.filter(({ daysUntilEvent }) =>
    daysUntilEvent != null && (daysUntilEvent === 7 || daysUntilEvent === 1 || daysUntilEvent <= 0)
  )

  const watchlistGrants = awardExpirationGrants.filter(({ daysUntilEvent }) =>
    daysUntilEvent != null && daysUntilEvent < 7 && daysUntilEvent > 1
  )

  const notificationBadgeCount = actionableNotificationGrants.length + actionableDeadlineGrants.length

  if (!isAuthenticated) return <Login onLogin={handleLogin} />

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header Navigation - Organized and Spacious */}
      <header className="border-b-2 border-laredo-gold-new bg-laredo-navy-new px-6 pt-2 pb-8 text-white shadow-lg">
        {/* Top Info Bar */}
        <div className="w-full border-b border-white/10">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[13px] text-white/45 uppercase font-black tracking-[0.22em]">Authorized Organization Representative:</span>
              <span className="max-w-[280px] truncate text-[15px] font-bold text-white/90" title={userEmail}>{userEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/8 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/12"
                  title="Notifications placeholder"
                >
                  <Bell size={15} />
                  Notifications
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-laredo-gold px-1.5 text-[9px] text-black">
                    {notificationBadgeCount}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[26rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                    <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Notification Center
                          </div>
                          <div className="mt-1 text-base font-bold text-slate-900">
                            {notificationBadgeCount} active notification alert{notificationBadgeCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={triggerNotificationCheck}
                          disabled={isNotificationJobRunning}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-laredo-gold-new px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-laredo-navy-new shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw size={13} className={isNotificationJobRunning ? 'animate-spin' : ''} />
                          {isNotificationJobRunning ? 'Running' : 'Run Check'}
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Deadlines</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{pipelineDeadlineGrants.length}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Alerts</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{notificationBadgeCount}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">History</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{notificationHistory.length}</div>
                        </div>
                      </div>
                      {notificationError && (
                        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          {notificationError}
                        </p>
                      )}
                    </div>

                    <div className="max-h-[34rem] overflow-y-auto px-5 py-4">
                      <div className="space-y-5">
                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                              Application Deadlines Alerts
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              {pipelineDeadlineGrants.length}
                            </span>
                          </div>
                          {pipelineDeadlineGrants.length === 0 ? (
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                              No available or applied grants are within 7 days of their deadline.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {pipelineDeadlineGrants.map(({ grant, daysUntilEvent }) => (
                                <div key={`${grant.id}-pipeline`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <div className="text-sm font-semibold leading-5 text-slate-900">{grant.title}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-600">
                                    {grant.id.startsWith('favorite-')
                                      ? 'Favorited Grant'
                                      : grant.status === 'applied'
                                      ? 'Applied Grant'
                                      : 'Available Grant'}
                                    {' - '}
                                    Closes {formatShortDate(grant.deadline)}
                                    {' - '}
                                    {daysUntilEvent != null && daysUntilEvent > 0
                                      ? `${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'} left`
                                      : 'due now'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                              Award Expiration Alerts
                            </h3>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                              {actionableNotificationGrants.length + watchlistGrants.length}
                            </span>
                          </div>
                          {actionableNotificationGrants.length === 0 && watchlistGrants.length === 0 ? (
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                              No approved grants are currently inside the 7-day expiration monitoring window.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {actionableNotificationGrants.map(({ grant, daysUntilEvent }) => (
                                <div key={grant.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-semibold leading-5 text-slate-900">{grant.title}</div>
                                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                                      {daysUntilEvent != null && daysUntilEvent <= 0
                                        ? 'Termination'
                                        : daysUntilEvent === 1
                                        ? 'Final'
                                        : 'Reminder'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs leading-5 text-slate-600">
                                    Expires {formatShortDate(getPrimaryNotificationDate(grant))}
                                    {' - '}
                                    {daysUntilEvent != null && daysUntilEvent > 0
                                      ? `${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'} left`
                                      : 'due now'}
                                  </div>
                                </div>
                              ))}
                              {watchlistGrants.map(({ grant, daysUntilEvent }) => (
                                <div key={`${grant.id}-watch`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-semibold leading-5 text-slate-900">{grant.title}</div>
                                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                                      Watchlist
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs leading-5 text-slate-600">
                                    Expires {formatShortDate(getPrimaryNotificationDate(grant))}
                                    {' - '}
                                    {daysUntilEvent} day{daysUntilEvent === 1 ? '' : 's'} left
                                    {' - '}
                                    Monitoring only
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                              Sent History
                            </h3>
                          </div>
                          {notificationHistory.length === 0 ? (
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                              No persisted notifications yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {notificationHistory.slice(0, 10).map((item) => (
                                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900">{item.notice_type}</div>
                                    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                      {formatShortDate(item.sent_on)}
                                    </div>
                                  </div>
                                  <div className="mt-1 text-sm text-slate-900">{item.title}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-600">
                                    {getNotificationEventLabel(item.event_kind)} {formatShortDate(item.event_date ?? item.expiration_date ?? undefined)}
                                    {' - '}
                                    Sent to {item.recipients.join(', ')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-md border border-red-400/35 bg-red-950/25 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-900/40"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pt-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3 self-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-laredo-gold-new shadow-inner ring-1 ring-white/10">
              <TrendingUp className="h-[18px] w-[18px] text-laredo-navy-new" />
            </div>
            <div className="flex flex-col items-start justify-center">
              <h1 className="text-[2rem] font-black uppercase leading-none tracking-[-0.06em] text-white sm:text-[2.3rem]">City of Laredo</h1>
              <p className="mt-2 inline-flex items-center rounded-sm border border-white/15 bg-white/8 px-2.5 py-1 text-[9px] font-bold uppercase leading-none tracking-[0.22em] text-white/90">
                Healthcare Grant Management
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-laredo-gold-new/20 bg-white/8 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {(['discovery', 'lifecycle', 'portfolio', 'reporting'] as const).map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`
                  rounded-lg border px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-300
                  ${activePage === page
                    ? 'border-laredo-gold-new bg-laredo-gold-new text-laredo-navy-new shadow-gold'
                    : 'border-transparent text-laredo-gold-new hover:border-laredo-gold-new/35 hover:bg-white/6'
                  }
                `}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg-page)] px-6 py-8 transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-secondary shadow-sm transition-colors hover:bg-app-muted"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button 
              onClick={fetchGrants}
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-secondary shadow-sm transition-colors hover:bg-app-muted hover:text-app-primary"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> 
              {isRefreshing ? 'Refreshing Data...' : 'Refresh Data'}
            </button>
            <button
              onClick={clearGrantData}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-app-card px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={14} />
              Clear Grant Data
            </button>
          </div>

          {activePage === 'discovery' && (
            <Discovery
              grants={grants}
              onGrantSaved={fetchGrants}
              onGrantTracked={() => setActivePage('lifecycle')}
            />
          )}
          {activePage === 'lifecycle' && <Lifecycle grants={grants} onUpdateStatus={updateGrantStatus} onReActivate={(id) => updateGrantStatus(id, 'applied')} onSaveEdit={saveGrantUpdate} onCreateGrant={createGrant} />}
          {activePage === 'portfolio' && <Portfolio grants={grants} onAction={handleAction} onSaveEdit={saveGrantUpdate} />}
          {activePage === 'reporting' && <Reporting grants={grants} />}
        </div>
      </main>
    </div>
  )
}

export default App
