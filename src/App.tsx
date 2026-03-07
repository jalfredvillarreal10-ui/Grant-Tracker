import { useState, useEffect } from 'react'
import { Search, ListChecks, Landmark, BarChart3, LogOut, RefreshCw } from 'lucide-react'
import Login from './components/Login'
import Discovery from './pages/Discovery'
import Lifecycle from './pages/Lifecycle'
import Portfolio from './pages/Portfolio'
import Reporting from './pages/Reporting'
import type { Grant } from './types/grant'

type Page = 'discovery' | 'lifecycle' | 'portfolio' | 'reporting';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [activePage, setActivePage] = useState<Page>('discovery')
  const [grants, setGrants] = useState<Grant[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch live grants from Python backend
  const fetchGrants = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('http://localhost:8000/api/grants');
      if (response.ok) {
        const dbGrants = await response.json();
        
        // Map backend database schema to your rich frontend UI schema
        const mappedGrants: Grant[] = dbGrants.map((g: any) => ({
          id: g.id.toString(),
          funderId: g.grant_number,
          title: g.title,
          source: g.agency,
          amount: g.amount || 0,
          status: g.status,
          deadline: g.deadline,
          submissionDate: g.submission_date,
          expectedNotificationDate: g.expected_notification_date,
          internalLead: g.internal_lead,
          applicationStatus: g.application_status,
          rejectionReason: g.rejection_reason,
          feedbackSummary: g.feedback_summary,
          denialDate: g.denial_date,
          expirationDate: g.expiration_date,
          spentAmount: g.spent_amount || 0,
          remainingAmount: g.amount - (g.spent_amount || 0),
          complianceCategory: g.compliance_category,
          programManager: g.program_manager,
          nextReportDue: g.next_report_due,
          onboardingDate: g.onboarding_date,
          isExtended: !!g.is_extended,
          renewalStatus: g.renewal_status || 'None'
        }));
        
        setGrants(mappedGrants);
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
          status: grant.status,
          submission_date: grant.submissionDate,
          expected_notification_date: grant.expectedNotificationDate,
          internal_lead: grant.internalLead,
          application_status: grant.applicationStatus,
          rejection_reason: grant.rejectionReason,
          feedback_summary: grant.feedbackSummary,
          denial_date: grant.denialDate
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

  const updateGrantStatus = async (id: string, status: GrantStatus, rejectionReason?: any, feedbackSummary?: string) => {
    const grant = grants.find(g => g.id === id);
    if (grant) {
      const updatedGrant: Grant = {
        ...grant,
        status,
        rejectionReason,
        feedbackSummary,
        denialDate: (status === 'denied' || status === 'withdrawn') ? new Date().toISOString().split('T')[0] : undefined
      };
      await saveGrantUpdate(updatedGrant);
    }
  }

  const handleAction = (id: string, action: string) => {
    if (action === 'renew') {
      setGrants(prev => prev.map(g => {
        if (g.id === id) return { ...g, renewalStatus: 'Initiated' }
        return g
      }))
    }
  }

  if (!isAuthenticated) return <Login onLogin={handleLogin} />

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>LHGP</h2>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Health Grant Pulse</span>
        </div>

        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activePage === 'discovery' ? 'active' : ''}`} onClick={() => setActivePage('discovery')}>
            <Search size={20} /> <span>Discovery</span>
          </div>
          <div className={`nav-item ${activePage === 'lifecycle' ? 'active' : ''}`} onClick={() => setActivePage('lifecycle')}>
            <ListChecks size={20} /> <span>Lifecycle</span>
          </div>
          <div className={`nav-item ${activePage === 'portfolio' ? 'active' : ''}`} onClick={() => setActivePage('portfolio')}>
            <Landmark size={20} /> <span>Portfolio</span>
          </div>
          <div className={`nav-item ${activePage === 'reporting' ? 'active' : ''}`} onClick={() => setActivePage('reporting')}>
            <BarChart3 size={20} /> <span>Reporting</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex flex-col">
              <span className="text-xs text-white opacity-40 uppercase font-bold tracking-tighter">Authorized User</span>
              <span className="text-xs font-semibold truncate" title={userEmail}>{userEmail}</span>
            </div>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(200, 16, 46, 0.2)', color: '#ff4d4d', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button 
              onClick={fetchGrants}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> 
              {isRefreshing ? 'Refreshing Data...' : 'Refresh Data'}
            </button>
          </div>

          {activePage === 'discovery' && <Discovery grants={grants} onMoveToApplied={moveToApplied} onGrantSaved={fetchGrants} />}
          {activePage === 'lifecycle' && <Lifecycle grants={grants} onUpdateStatus={updateGrantStatus} onReActivate={(id) => updateGrantStatus(id, 'available')} />}
          {activePage === 'portfolio' && <Portfolio grants={grants} onAction={handleAction} />}
          {activePage === 'reporting' && <Reporting grants={grants} />}
        </div>
      </main>
    </div>
  )
}

export default App