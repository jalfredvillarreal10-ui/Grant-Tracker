import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Grant, GrantStatus } from '../types/grant';
import GrantCard from '../components/GrantCard';
import ExitInterviewModal from '../components/ExitInterviewModal';

interface LifecycleProps {
  grants: Grant[];
  onUpdateStatus: (id: string, status: GrantStatus, rejectionReason?: any, feedbackSummary?: string) => void;
  onReActivate: (id: string) => void;
}

const Lifecycle: React.FC<LifecycleProps> = ({ grants, onUpdateStatus, onReActivate }) => {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedGrantForExit, setSelectedGrantForExit] = useState<Grant | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Grant | null>(null);


const activeGrants = grants
  .filter(g => g.status === 'applied') 
  .sort((a, b) => new Date(a.deadline ?? '9999-12-31').getTime() - new Date(b.deadline ?? '9999-12-31').getTime());

const archivedGrants = grants
  .filter(g => g.status === 'closed' || g.status === 'denied' || g.status === 'withdrawn');

  const handleUpdateStatus = (id: string, status: GrantStatus) => {
    if (status === 'denied' || status === 'withdrawn') {
      const grant = grants.find(g => g.id === id);
      if (grant) {
        setSelectedGrantForExit({ ...grant, status });
      }
    } else {
      onUpdateStatus(id, status);
    }
  };

  const handleExitInterviewSubmit = (reason: any, summary: string) => {
    if (selectedGrantForExit) {
      onUpdateStatus(selectedGrantForExit.id, selectedGrantForExit.status, reason, summary);
      setSelectedGrantForExit(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <header>
        <h1 className="text-3xl font-bold text-blue-900">Application Lifecycle</h1>
        <p className="text-zinc-500">Monitoring submitted applications and pending decisions.</p>
      </header>

      <div style={{ width: '100%', maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {activeGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>

      {activeGrants.length === 0 && (
        <div className="p-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400">
          No active applications. Move a grant from Discovery to start tracking.
        </div>
      )}

      {/* --- ARCHIVE SECTION --- */}
      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => setIsArchiveOpen(!isArchiveOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '20px',
            border: '1px solid #d9e2ef',
            background: '#fff',
            padding: '16px 18px',
            boxShadow: '0 8px 18px rgba(15,23,42,0.05)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', background: '#f3f6fb', color: '#002d62', flexShrink: 0 }}>
              <Info size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: '#002d62' }}>Closed/Unsuccessful Applications</span>
              
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '6px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b' }}>
              {archivedGrants.length} Records
            </span>
            <span style={{ color: '#64748b', display: 'flex' }}>
              {isArchiveOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </span>
          </div>
        </button>

        <AnimatePresence>
          {isArchiveOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div style={{ paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ width: '100%', maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {archivedGrants.map(grant => (
                    <GrantCard 
                      key={grant.id} 
                      grant={grant}
                      onReActivate={onReActivate}
                      onShowFeedback={setSelectedFeedback}
                    />
                  ))}
                </div>

                {archivedGrants.length === 0 && (
                  <div style={{ borderRadius: '20px', border: '1px dashed #cbd5e1', background: '#fff', padding: '32px', textAlign: 'center', boxShadow: '0 8px 18px rgba(15,23,42,0.05)' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: '#002d62' }}>No archived applications yet.</p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Closed, denied, and withdrawn records will appear here automatically.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}
      {selectedGrantForExit && (
        <ExitInterviewModal
          grant={selectedGrantForExit}
          isOpen={!!selectedGrantForExit}
          onClose={() => setSelectedGrantForExit(null)}
          onSubmit={handleExitInterviewSubmit}
        />
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-zinc-800 p-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare size={20} /> Funder Feedback</h2>
              <button onClick={() => setSelectedFeedback(null)} className="text-white/80 hover:text-white">Close</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Reason for Rejection</span>
                <div className="p-3 bg-red-50 text-red-900 rounded-lg font-bold border border-red-100">
                  {selectedFeedback.rejectionReason}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Feedback Summary</span>
                <p className="text-sm text-zinc-600 bg-zinc-50 p-4 rounded-lg border border-zinc-100 italic">
                  "{selectedFeedback.feedbackSummary}"
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Lifecycle;
