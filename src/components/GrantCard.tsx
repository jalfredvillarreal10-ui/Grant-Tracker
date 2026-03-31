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

  // Urgency logic
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

  const burnRate = grant.amount > 0 ? ((grant.spentAmount || 0) / grant.amount) * 100 : 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl shadow-md p-6 flex flex-col gap-5 border border-zinc-200 transition-all ${
        isUnsuccessful ? 'bg-slate-50 border-l-8 border-l-slate-400' : 'bg-white hover:shadow-lg'
      }`}
    >
      {/* 1. HEADER SECTION */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 block mb-1">
            {grant.funderId}
          </span>
          <h3 className={`text-xl font-extrabold leading-tight ${isUnsuccessful ? 'text-zinc-600' : 'text-blue-950'}`}>
            {grant.title}
          </h3>
        </div>
        
        {/* Badges and Status Tags */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isPremium && !isUnsuccessful && (
            <div className={`px-3 py-1 rounded text-[10px] font-bold border ${
              grant.status === 'approved' 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {grant.status === 'approved' ? '👑 LAREDO GOLD PRIORITY' : 'PREMIUM OPPORTUNITY'}
            </div>
          )}
          {isUnsuccessful && (
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase bg-zinc-200 text-zinc-600 px-2 py-1 rounded">
                {grant.status}
              </span>
              <button onClick={() => onShowFeedback?.(grant)} className="p-1.5 bg-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-300">
                <Mail size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. METADATA GRID */}
      <div className={`grid grid-cols-2 gap-4 py-3 border-y ${isUnsuccessful ? 'border-zinc-200' : 'border-zinc-100'}`}>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Award: </span>
          <span className={`text-lg font-black ${isUnsuccessful ? 'text-zinc-500' : 'text-zinc-900'}`}>
            ${grant.amount.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Source: </span>
          <span className={`text-sm font-semibold truncate block ${isUnsuccessful ? 'text-zinc-500' : 'text-zinc-700'}`}>
            {grant.source}
          </span>
        </div>
      </div>

      {/* 3. STATUS SPECIFIC CONTENT */}
      {grant.status === 'applied' && (
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Current Status: <span className="text-blue-900">{grant.applicationStatus}</span></span>
              
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-900 h-full transition-all duration-700" 
                style={{ width: grant.applicationStatus === 'Submitted' ? '33%' : grant.applicationStatus === 'Under Review' ? '66%' : '100%' }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-zinc-600">
            <div className="flex items-center gap-2"><User size={14} className="text-zinc-400"/> {grant.internalLead}</div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-zinc-400"/> Decision: {grant.expectedNotificationDate}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => onUpdateStatus?.(grant.id, 'denied')} className="flex-1 text-[10px] font-bold uppercase py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 shadow-sm transition-all">
              Mark Denied
            </button>
            <button onClick={() => onUpdateStatus?.(grant.id, 'withdrawn')} className="flex-1 text-[10px] font-bold uppercase py-2.5 border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-100 shadow-sm transition-all">
              Withdraw
            </button>
            <button onClick={() => onUpdateStatus?.(grant.id, 'approved')} className="flex-1 text-[10px] font-bold uppercase py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm transition-all">
              Approve
            </button>
          </div>
        </div>
      )}

      {/* 4. UNSUCCESSFUL REASON */}
      {isUnsuccessful && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] leading-relaxed text-zinc-600 bg-white/50 p-3 rounded border border-dashed border-zinc-300">
            <strong className="text-zinc-800 uppercase text-[9px]">Decision Note:</strong> {grant.rejectionReason}
          </div>
          <button onClick={() => onReActivate?.(grant.id)} className="w-full py-2.5 bg-[#C5B358] rounded-lg text-white text-[10px] font-black uppercase tracking-wider hover:brightness-110 shadow-md flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Re-Activate Opportunity
          </button>
        </div>
      )}

      {/* (Other statuses like 'available' and 'approved' would follow similar logic...) */}
      
    </motion.div>
  );
};

export default GrantCard;