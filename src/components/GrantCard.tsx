import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, User, Mail } from 'lucide-react';
import type { Grant } from '../types/grant';

interface GrantCardProps {
  grant: Grant;
  onMoveToApplied?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
}

const GrantCard: React.FC<GrantCardProps> = ({ grant, onMoveToApplied, onAction }) => {
  const isPremium = grant.amount >= 500000;

  // Urgency logic for Approved grants
  let urgencyLevel: 'none' | 'warning' | 'critical' = 'none';
  let daysRemaining = 0;

  if (grant.expirationDate) {
    const expDate = new Date(grant.expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 1) urgencyLevel = 'critical';
    else if (daysRemaining <= 30) urgencyLevel = 'warning';
  }

  const getUrgencyClass = () => {
    if (urgencyLevel === 'critical') return 'urgency-critical';
    if (urgencyLevel === 'warning') return 'urgency-warning';
    return '';
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-zinc-100 ${getUrgencyClass()}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {isPremium && (
        <div className="badge-premium" style={{ position: 'absolute', top: '12px', right: '12px' }}>
          PREMIUM OPPORTUNITY
        </div>
      )}

      <div className="flex justify-between items-start pr-32">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{grant.funderId}</span>
          <h3 className="text-xl font-bold text-blue-900 m-0">{grant.title}</h3>
        </div>
      </div>

      <div className="flex items-center gap-6 py-2 border-y border-zinc-50">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Reward Amount</span>
          <span className="text-lg font-bold text-zinc-900">${grant.amount.toLocaleString()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Source</span>
          <span className="text-sm font-medium text-zinc-700">{grant.source}</span>
        </div>
      </div>

      {/* Conditional Content based on Status */}
      {grant.status === 'available' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Clock className="w-4 h-4" />
            <span>Deadline: <strong>{grant.deadline}</strong></span>
          </div>
          {onMoveToApplied && (
            <button 
              onClick={() => onMoveToApplied(grant.id)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Move to Applied <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {grant.status === 'applied' && (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase text-zinc-400">
              <span>Status: {grant.applicationStatus}</span>
              <span>Timeline</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-900 h-full transition-all duration-1000" 
                style={{ 
                  width: grant.applicationStatus === 'Submitted' ? '33%' : 
                         grant.applicationStatus === 'Under Review' ? '66%' : '100%' 
                }} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 text-zinc-600">
              <User className="w-3 h-3" /> <span>{grant.internalLead}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="w-3 h-3" /> <span>Decision: {grant.expectedNotificationDate}</span>
            </div>
          </div>
        </div>
      )}

      {grant.status === 'approved' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400 uppercase font-semibold">Expires In</span>
              <span className={`text-sm font-bold ${daysRemaining < 30 ? 'text-red-600' : 'text-zinc-900'}`}>
                {daysRemaining} Days
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-400 uppercase font-semibold">Remaining Funds</span>
              <span className="text-sm font-bold text-emerald-600">${grant.remainingAmount?.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onAction?.(grant.id, 'renew')}
              className="flex-1 text-xs font-bold uppercase py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {grant.renewalStatus === 'Initiated' ? 'Renewal Pending' : 'Initiate Renewal'}
            </button>
            <button 
              onClick={() => onAction?.(grant.id, 'close')}
              className="flex-1 text-xs font-bold uppercase py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Closeout
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GrantCard;
