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
          amount: 250000, // Hardcoded premium amount so it shows in Discovery filter
          status: 'available', // Defaulting to available for new intakes
          deadline: g.deadline,
          applicationStatus: 'Not Started'
        }));
        
        setGrants(mappedGrants);
      }
    } catch (error) {
      console.error("Failed to fetch grants:", error);
    } finally {
      setIsRefreshing(false)
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

  // NOTE: For now, these just update UI state. 
  // In the future, we will connect these to PUT/PATCH backend routes.
  const moveToApplied = (id: string) => {
    setGrants(prev => prev.map(g => {
      if (g.id === id) {
        return { 
          ...g, 
          status: 'applied', 
          submissionDate: new Date().toISOString().split('T')[0],
          applicationStatus: 'Submitted'
        }
      }
      return g
    }))
    setActivePage('lifecycle')
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
          {activePage === 'lifecycle' && <Lifecycle grants={grants} />}
          {activePage === 'portfolio' && <Portfolio grants={grants} onAction={handleAction} />}
          {activePage === 'reporting' && <Reporting grants={grants} />}
        </div>
      </main>
    </div>
  )
}

export default App