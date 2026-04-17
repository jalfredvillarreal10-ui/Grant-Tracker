import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, ExternalLink, X } from 'lucide-react';
import type { Grant } from '../types/grant';

interface CloseoutChecklistModalProps {
  grant: Grant | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (grant: Grant) => void;
}

const CloseoutChecklistModal: React.FC<CloseoutChecklistModalProps> = ({ grant, isOpen, onClose, onConfirm }) => {
  if (!grant) return null;

  const portalUrl =
    grant.grantsGovId
      ? `https://www.grants.gov/search-results-detail/${grant.grantsGovId}`
      :
    grant.funderPortalUrl ||
    `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.funderId)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-app-card shadow-2xl"
          >
            <div className="flex items-center justify-between bg-[#002d62] p-4 text-white">
              <div>
                <h2 className="text-lg font-bold">Closeout Checklist</h2>
                <p className="text-xs uppercase tracking-wider text-white/70">{grant.funderId}</p>
              </div>
              <button onClick={onClose} className="text-white/80 transition-colors hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="flex flex-col gap-5 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Finalize closeout for <strong>{grant.title}</strong> using the City of Laredo standard account-completion workflow.
              </div>

              <div className="grid gap-3 text-sm text-slate-700">
                {[
                  'Validate final expenditures and reconcile the remaining balance.',
                  'Submit final narrative and financial reports to the funding agency.',
                  'Archive compliance documents, invoices, and supporting records.',
                  'Confirm departmental handoff and record retention for audit review.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <CheckSquare size={18} className="mt-0.5 text-[#002d62]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#002d62] hover:underline"
                >
                  Open Funder Portal
                  <ExternalLink size={16} />
                </a>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirm(grant)}
                    className="rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white transition-colors hover:bg-emerald-800"
                  >
                    Mark Grant Closed
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CloseoutChecklistModal;
