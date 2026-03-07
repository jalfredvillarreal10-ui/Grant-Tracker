import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Save } from 'lucide-react';
import type { Grant } from '../types/grant';

interface ExitInterviewModalProps {
  grant: Grant;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rejectionReason: any, feedbackSummary: string) => void;
}

const ExitInterviewModal: React.FC<ExitInterviewModalProps> = ({ grant, isOpen, onClose, onSubmit }) => {
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [feedbackSummary, setFeedbackSummary] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
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
                <label className="text-xs font-bold uppercase text-zinc-400">Primary Rejection Reason</label>
                <select
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-[#002d62]"
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Lack of Matching Funds">Lack of Matching Funds</option>
                  <option value="Eligibility Technicality">Eligibility Technicality</option>
                  <option value="Funder Budget Cut">Funder Budget Cut</option>
                  <option value="Proposal Score">Proposal Score</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Reviewer Feedback Summary</label>
                <textarea
                  required
                  placeholder="Enter a brief summary of reviewer comments or internal findings..."
                  value={feedbackSummary}
                  onChange={(e) => setFeedbackSummary(e.target.value)}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-[#002d62] min-h-[120px] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-lg font-bold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
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