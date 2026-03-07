import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, User, Mail, RefreshCw, Briefcase, FileText, ExternalLink } from 'lucide-react';
import type { Grant } from '../types/grant';

interface GrantCardProps {
  grant: Grant;
  onMoveToApplied?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onUpdateStatus?: (id: string, status: any) => void;
  onReActivate?: (id: string) => void;
  onShowFeedback?: (grant: Grant) => void;
}

const GrantCard: React.FC<GrantCardProps> = ({ 
  grant, 
  onMoveToApplied, 
  onAction, 
  onUpdateStatus,
  onReActivate,
  onShowFeedback
}) => {
  const isPremium = grant.amount >= 500000;
  const isUnsuccessful = grant.status === 'denied' || grant.status === 'withdrawn';

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

  const burnRate = grant.amount > 0 ? ((grant.spentAmount || 0) / grant.amount) * 100 : 0;

  const cardStyle = isUnsuccessful 
    ? { backgroundColor: '#f1f5f9', borderLeft: '6px solid #64748b' } 
    : { position: 'relative' as const, overflow: 'hidden' as const };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-zinc-100 ${getUrgencyClass()} ${!isUnsuccessful ? 'bg-white' : ''}`}
      style={cardStyle}
    >
      {isPremium && !isUnsuccessful && (
        <div 
          className={grant.status === 'approved' ? 'badge-premium bg-[#ffd700] text-[#002d62]' : 'badge-premium'} 
          style={{ position: 'absolute', top: '12px', right: '12px', borderColor: '#b8860b' }}
        >
          {grant.status === 'approved' ? 'LAREDO GOLD PRIORITY' : 'PREMIUM OPPORTUNITY'}
        </div>
      )}

      <div className="flex justify-between items-start pr-32">
        <div className="flex flex-col gap-1">
          <span className={`text-xs font-bold uppercase tracking-widest ${isUnsuccessful ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {grant.funderId}
          </span>
          <h3 className={`text-xl font-bold m-0 ${isUnsuccessful ? 'text-zinc-700' : 'text-blue-900'}`}>
            {grant.title}
          </h3>
        </div>
        {isUnsuccessful && (
          <div className="flex items-center gap-2" style={{ position: 'absolute', top: '12px', right: '12px' }}>
            <span className="text-[10px] font-bold uppercase bg-zinc-200 text-zinc-600 px-2 py-1 rounded">
              {grant.status}
            </span>
            <button 
              onClick={() => onShowFeedback?.(grant)}
              title="View Reviewer Feedback"
              className="p-1.5 bg-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-300 transition-colors"
            >
              <Mail size={14} />
            </button>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-6 py-2 border-y ${isUnsuccessful ? 'border-zinc-200' : 'border-zinc-50'}`}>
        <div className="flex flex-col">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Total Award</span>
          <span className={`text-lg font-bold ${isUnsuccessful ? 'text-zinc-600' : 'text-zinc-900'}`}>
            ${grant.amount.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Source</span>
          <span className={`text-sm font-medium ${isUnsuccessful ? 'text-zinc-500' : 'text-zinc-700'}`}>
            {grant.source}
          </span>
        </div>
        {grant.status === 'approved' && (
          <div className="flex flex-col ml-auto">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Category</span>
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
              {grant.complianceCategory || 'General'}
            </span>
          </div>
        )}
        {isUnsuccessful && (
          <div className="flex flex-col ml-auto">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Denial Date</span>
            <span className="text-sm font-bold text-zinc-600">{grant.denialDate}</span>
          </div>
        )}
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
          <div className="grid grid-cols-2 gap-4 text-xs mb-2">
            <div className="flex items-center gap-2 text-zinc-600">
              <User className="w-3 h-3" /> <span>{grant.internalLead}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="w-3 h-3" /> <span>Decision: {grant.expectedNotificationDate}</span>
            </div>
          </div>
          <div className="flex gap-2 border-t pt-4">
            <button 
              onClick={() => onUpdateStatus?.(grant.id, 'denied')}
              className="flex-1 text-[10px] font-bold uppercase py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Mark Denied
            </button>
            <button 
              onClick={() => onUpdateStatus?.(grant.id, 'withdrawn')}
              className="flex-1 text-[10px] font-bold uppercase py-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Withdraw
            </button>
            <button 
              onClick={() => onUpdateStatus?.(grant.id, 'approved')}
              className="flex-1 text-[10px] font-bold uppercase py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {isUnsuccessful && (
        <div className="flex flex-col gap-3">
          <div className="text-xs italic text-zinc-500 bg-zinc-200/50 p-2 rounded">
            <strong>Reason:</strong> {grant.rejectionReason}
          </div>
          <button 
            onClick={() => onReActivate?.(grant.id)}
            style={{ backgroundColor: '#C5B358' }}
            className="w-full py-2 rounded-lg text-white text-xs font-bold uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={14} /> Re-Activate Opportunity
          </button>
        </div>
      )}

      {grant.status === 'approved' && (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase text-zinc-400">
              <span>Spending Burn Rate</span>
              <span className={burnRate > 90 ? 'text-red-600' : 'text-emerald-600'}>{Math.round(burnRate)}% Utilized</span>
            </div>
            <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${burnRate > 90 ? 'bg-red-600' : 'bg-emerald-600'}`} 
                style={{ width: `${Math.min(burnRate, 100)}%` }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-400 uppercase font-bold tracking-tighter flex items-center gap-1">
                <Briefcase size={12} /> Program Manager
              </span>
              <span className="font-semibold text-zinc-700">{grant.programManager || 'Unassigned'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-400 uppercase font-bold tracking-tighter flex items-center gap-1">
                <FileText size={12} /> Next Report Due
              </span>
              <div className="flex items-center gap-1 font-semibold text-blue-900">
                {grant.nextReportDue || 'TBD'} <ExternalLink size={10} className="cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
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
              Closeout Checklist
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GrantCard;
