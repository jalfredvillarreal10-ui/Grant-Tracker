import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, MessageSquare, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Grant, GrantStatus } from '../types/grant';
import GrantCard from '../components/GrantCard';
import ExitInterviewModal from '../components/ExitInterviewModal';

interface LifecycleProps {
  grants: Grant[];
  onUpdateStatus: (
    id: string,
    status: GrantStatus,
    rejectionReason?: Grant['rejectionReason'],
    feedbackSummary?: string
  ) => void;
  onReActivate: (id: string) => void;
  onSaveEdit: (grant: Grant) => Promise<boolean | void>;
  onCreateGrant: (grant: Grant) => Promise<boolean | void>;
}

const Lifecycle: React.FC<LifecycleProps> = ({ grants, onUpdateStatus, onReActivate, onSaveEdit, onCreateGrant }) => {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedGrantForExit, setSelectedGrantForExit] = useState<Grant | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Grant | null>(null);
  const [manualGrant, setManualGrant] = useState<Grant | null>(null);


const activeGrants = grants
  .filter(g => g.status === 'applied' || g.status === 'available')
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

  const handleExitInterviewSubmit = (reason: Grant['rejectionReason'], summary: string) => {
    if (selectedGrantForExit) {
      onUpdateStatus(selectedGrantForExit.id, selectedGrantForExit.status, reason, summary);
      setSelectedGrantForExit(null);
    }
  };

  const handleAddGrant = () => {
    if (manualGrant) return;

    const today = new Date().toISOString().split('T')[0];
    const tempId = `draft-${Date.now()}`;

    setManualGrant({
      id: tempId,
      title: '',
      funderId: `MANUAL-${Date.now()}`,
      source: 'Federal',
      amount: 0,
      status: 'applied',
      deadline: '',
      submissionDate: today,
      applicationStatus: 'Submitted',
      awardFloor: undefined,
      awardCeiling: undefined,
      expectedNotificationDate: undefined,
      pocName: undefined,
      pocEmail: undefined,
      internalLead: undefined,
      rejectionReason: undefined,
      feedbackSummary: undefined,
      denialDate: undefined,
      expirationDate: undefined,
      spentAmount: 0,
      remainingAmount: 0,
      renewalStatus: 'None',
      complianceCategory: undefined,
      programManager: undefined,
      nextReportDue: undefined,
      onboardingDate: undefined,
      isExtended: false,
      funderPortalUrl: undefined,
      grantsGovId: undefined,
    });
  };

  const handleCreateGrant = async (grant: Grant) => {
    const created = await onCreateGrant(grant);
    if (created !== false) {
      setManualGrant(null);
    }
    return created;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-3xl font-bold text-app-primary">Application Lifecycle</h1>
          <p className="text-app-secondary">Monitoring submitted applications and pending decisions.</p>
        </div>
        <button
          type="button"
          onClick={handleAddGrant}
          disabled={!!manualGrant}
          className="inline-flex items-center gap-2 rounded-lg bg-laredo-navy px-4 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusCircle className="h-4 w-4" />
          Add Grant
        </button>
      </header>

      <div style={{ width: '100%', maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {manualGrant && (
          <GrantCard
            key={manualGrant.id}
            grant={manualGrant}
            onSaveEdit={handleCreateGrant}
            onCancelEdit={() => setManualGrant(null)}
            summaryMetric="ceiling"
            approvedDetailMetric="ceiling"
            startInEditMode
          />
        )}
        {activeGrants.map(grant => (
          <GrantCard 
            key={grant.id} 
            grant={grant}
            onUpdateStatus={handleUpdateStatus}
            onSaveEdit={onSaveEdit}
            summaryMetric="ceiling"
            approvedDetailMetric="ceiling"
          />
        ))}
      </div>

      {activeGrants.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-app-border bg-app-muted p-12 text-center text-app-secondary-muted/80">
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
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            padding: '16px 18px',
            boxShadow: 'var(--shadow-elevated)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', background: 'var(--bg-panel)', color: 'var(--text-link)', flexShrink: 0 }}>
              <Info size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Closed/Unsuccessful Applications</span>
              
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ borderRadius: '999px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '6px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
              {archivedGrants.length} Records
            </span>
            <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>
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
                      onSaveEdit={onSaveEdit}
                      summaryMetric="ceiling"
                      approvedDetailMetric="ceiling"
                    />
                  ))}
                </div>

                {archivedGrants.length === 0 && (
                  <div style={{ borderRadius: '20px', border: '1px dashed var(--border-color)', background: 'var(--bg-card)', padding: '32px', textAlign: 'center', boxShadow: 'var(--shadow-elevated)' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>No archived applications yet.</p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Closed, denied, and withdrawn records will appear here automatically.</p>
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md overflow-hidden rounded-2xl bg-app-card shadow-2xl">
            <div className="bg-zinc-800 p-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare size={20} /> Funder Feedback</h2>
              <button onClick={() => setSelectedFeedback(null)} className="text-white/80 hover:text-white">Close</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-app-secondary-muted/80">Reason for Rejection</span>
                <div className="p-3 bg-red-50 text-red-900 rounded-lg font-bold border border-red-100">
                  {selectedFeedback.rejectionReason}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-app-secondary-muted/80">Feedback Summary</span>
                <p className="rounded-lg border border-app-border bg-app-muted p-4 text-sm italic text-app-secondary">
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
