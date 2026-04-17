import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Save } from 'lucide-react';
import type { Grant } from '../types/grant';

interface ExitInterviewModalProps {
  grant: Grant;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rejectionReason: NonNullable<Grant['rejectionReason']>, feedbackSummary: string) => void;
}

const ExitInterviewModal: React.FC<ExitInterviewModalProps> = ({ grant, isOpen, onClose, onSubmit }) => {
  const [rejectionReason, setRejectionReason] = useState<NonNullable<Grant['rejectionReason']> | ''>('');
  const [feedbackSummary, setFeedbackSummary] = useState('');

  const rejectionReasons: NonNullable<Grant['rejectionReason']>[] = [
    'Lack of Matching Funds',
    'Eligibility Technicality',
    'Funder Budget Cut',
    'Proposal Score',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason) return;
    onSubmit(rejectionReason, feedbackSummary);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-app-card shadow-2xl"
          >
            <div className="bg-[#002d62] p-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Exit Interview: {grant.funderId}</h2>
              <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p>To maintain departmental records for high-value targets, please provide the following details regarding the unsuccessful application.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-app-secondary-muted/80">Primary Rejection Reason</label>
                <select
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value as NonNullable<Grant['rejectionReason']>)}
                  className="rounded-lg border border-app-border bg-app-muted p-3 outline-none focus:border-[#002d62]"
                >
                  <option value="" disabled>Select a reason...</option>
                  {rejectionReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-app-secondary-muted/80">Reviewer Feedback Summary</label>
                <textarea
                  required
                  placeholder="Enter a brief summary of reviewer comments or internal findings..."
                  value={feedbackSummary}
                  onChange={(e) => setFeedbackSummary(e.target.value)}
                  className="min-h-[120px] resize-none rounded-lg border border-app-border bg-app-muted p-3 outline-none focus:border-[#002d62]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-app-border px-4 py-3 font-bold text-app-secondary transition-colors hover:bg-app-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Save size={18} /> Save & Archive
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExitInterviewModal;
