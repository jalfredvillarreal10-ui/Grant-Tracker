import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Info, MessageSquare } from 'lucide-react';
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
    .sort((a, b) => {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return dateA - dateB;
    });

  const unsuccessfulGrants = grants
    .filter(g => g.status === 'denied' || g.status === 'withdrawn')
    .sort((a, b) => {
      const dateA = a.denialDate ? new Date(a.denialDate).getTime() : 0;
      const dateB = b.denialDate ? new Date(b.denialDate).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

  const lostOpportunityValue = unsuccessfulGrants.reduce((acc, g) => acc + g.amount, 0);

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
    <div className="flex flex-col gap-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-blue-900">Application Lifecycle</h1>
        <p className="text-zinc-500">Monitoring submitted applications and pending decisions.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
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
      <div className="mt-8">
        <button 
          onClick={() => setIsArchiveOpen(!isArchiveOpen)}
          className="w-full flex items-center justify-between p-4 bg-[#002147] text-white rounded-xl shadow-md hover:bg-[#002d62] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold">Closed/Unsuccessful Applications</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{unsuccessfulGrants.length} Records</span>
          </div>
          {isArchiveOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <AnimatePresence>
          {isArchiveOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 flex flex-col gap-6">
                <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Total Lost Opportunity Value (FY26)</span>
                    <span className="text-2xl font-black text-zinc-600">${lostOpportunityValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-zinc-100 rounded-lg text-zinc-500 text-xs font-medium">
                    <Info size={14} /> Records are maintained for labor accountability and trend identification.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                  {unsuccessfulGrants.map(grant => (
                    <GrantCard 
                      key={grant.id} 
                      grant={grant}
                      onReActivate={onReActivate}
                      onShowFeedback={setSelectedFeedback}
                    />
                  ))}
                </div>

                {unsuccessfulGrants.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-100">
                    No historical records found.
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
