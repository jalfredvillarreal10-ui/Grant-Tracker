import { useState, useEffect } from 'react'
import { Search, ListChecks, Landmark, BarChart3, LogOut, RefreshCw, Sun, Moon, Trash2, TrendingUp } from 'lucide-react'
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

function optionalString(value?: string | null) {
  return value ?? undefined;
}

type OpportunityDetailsResponse = {
  award_floor?: number | null;
  award_ceiling?: number | null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [activePage, setActivePage] = useState<Page>('discovery')
  const [grants, setGrants] = useState<Grant[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

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
        const mappedGrants: Grant[] = dbGrants.map((g) => ({
          id: g.id.toString(),
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
        }));
        
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
                  amount: details.award_ceiling ?? grant.amount,
                  awardFloor: details.award_floor ?? grant.awardFloor,
                  awardCeiling: details.award_ceiling ?? grant.awardCeiling,
                  remainingAmount:
                    (details.award_ceiling ?? grant.amount) - (grant.spentAmount || 0),
                };

                const saveResponse = await fetch(`http://localhost:8000/api/grants/${grant.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    grant_number: updatedGrant.funderId,
                    title: updatedGrant.title,
                    agency: updatedGrant.source,
                    deadline: updatedGrant.deadline,
                    amount: updatedGrant.amount,
                    award_floor: updatedGrant.awardFloor,
                    award_ceiling: updatedGrant.awardCeiling,
                    status: updatedGrant.status,
                    submission_date: updatedGrant.submissionDate,
                    expected_notification_date: updatedGrant.expectedNotificationDate,
                    poc_name: updatedGrant.pocName,
                    poc_email: updatedGrant.pocEmail,
                    internal_lead: updatedGrant.internalLead,
                    application_status: updatedGrant.applicationStatus,
                    rejection_reason: updatedGrant.rejectionReason,
                    feedback_summary: updatedGrant.feedbackSummary,
                    denial_date: updatedGrant.denialDate,
                    expiration_date: updatedGrant.expirationDate,
                    spent_amount: updatedGrant.spentAmount || 0,
                    compliance_category: updatedGrant.complianceCategory,
                    program_manager: updatedGrant.programManager,
                    next_report_due: updatedGrant.nextReportDue,
                    onboarding_date: updatedGrant.onboardingDate,
                    is_extended: !!updatedGrant.isExtended,
                    renewal_status: updatedGrant.renewalStatus || 'None',
                    funder_portal_url: updatedGrant.funderPortalUrl,
                    grants_gov_id: updatedGrant.grantsGovId,
                  })
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
              setGrants(refreshedDbGrants.map((g) => ({
                id: g.id.toString(),
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
              })));
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
        body: JSON.stringify({
          grant_number: grant.funderId,
          title: grant.title,
          agency: grant.source,
          deadline: grant.deadline,
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
        })
      });
      if (response.ok) {
        fetchGrants();
      }
    } catch (error) {
      console.error("Failed to update grant:", error);
    }
  }

  // Fetch when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchGrants();
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

  const moveToApplied = async (id: string) => {
    const grant = grants.find(g => g.id === id);
    if (grant) {
      const updatedGrant: Grant = {
        ...grant,
        status: 'applied',
        submissionDate: new Date().toISOString().split('T')[0],
        applicationStatus: 'Submitted'
      };
      await saveGrantUpdate(updatedGrant);
      setActivePage('lifecycle');
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

  if (!isAuthenticated) return <Login onLogin={handleLogin} />

  return (
    <div className="app-layout">
      {/* Header Navigation - Organized and Spacious */}
      <header className="relative bg-laredo-navy-new text-white pt-1 pb-4 px-8 shadow-lg border-b-2 border-laredo-gold-new"> 
        {/* Top Info Bar */}
        <div className="max-w-7xl mx-auto flex justify-between items-center mb-2 border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Authorized System User:</span>
            <span className="text-[11px] font-bold text-white truncate max-w-[250px]" title={userEmail}>{userEmail}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-red-900/20 text-red-400 border-none px-3 py-1 rounded-md cursor-pointer font-black text-[9px] hover:bg-red-900/40 transition-colors uppercase tracking-widest"
          >
            <LogOut size={10} /> Sign Out
          </button>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">        
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-laredo-gold-new rounded-full flex items-center justify-center shadow-inner">
              <TrendingUp className="text-laredo-navy-new w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">City of Laredo</h1>
              <p className="text-laredo-gold-new text-[8px] font-bold tracking-widest uppercase leading-none mt-1">Healthcare Grant Management</p>
            </div>
          </div>

          <nav className="flex bg-laredo-navy-new/50 p-1 rounded-lg border border-laredo-gold-new/20">
            {(['discovery', 'lifecycle', 'portfolio', 'reporting'] as const).map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`
                  px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2
                  ${activePage === page
                    ? 'bg-laredo-gold-new text-laredo-navy-new border-laredo-gold-new shadow-gold'
                    : 'text-laredo-gold-new border-transparent hover:border-laredo-gold-new/50'
                  }
                `}
                style={{ cursor: 'pointer' }}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>

        {/* LHGP Label on the border */}
        <div className="absolute -bottom-[9px] right-12 bg-laredo-gold-new text-laredo-navy-new px-2 py-0.5 text-[8px] font-black rounded-sm shadow-md border border-laredo-navy-new/10 z-10">
          LHGP
        </div>
      </header>

      {/* Main Area */}
      <main className="main-content" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
            <button 
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={fetchGrants}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> 
              {isRefreshing ? 'Refreshing Data...' : 'Refresh Data'}
            </button>
            <button
              onClick={clearGrantData}
              className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={14} />
              Clear Grant Data
            </button>
          </div>

          {activePage === 'discovery' && (
            <Discovery
              grants={grants}
              onMoveToApplied={moveToApplied}
              onGrantSaved={fetchGrants}
              onGrantTracked={() => setActivePage('lifecycle')}
            />
          )}
          {activePage === 'lifecycle' && <Lifecycle grants={grants} onUpdateStatus={updateGrantStatus} onReActivate={(id) => updateGrantStatus(id, 'available')} />}
          {activePage === 'portfolio' && <Portfolio grants={grants} onAction={handleAction} />}
          {activePage === 'reporting' && <Reporting grants={grants} />}
        </div>
      </main>
    </div>
  )
}

export default App
