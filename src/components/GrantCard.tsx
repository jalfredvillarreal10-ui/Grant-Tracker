import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronUp,
  Clock,
  ExternalLink,
  Hash,
  Pencil,
  RefreshCw,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import type { Grant, GrantStatus } from '../types/grant';

interface GrantCardProps {
  grant: Grant;
  onMoveToApplied?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onUpdateStatus?: (id: string, status: GrantStatus) => void;
  onReActivate?: (id: string) => void;
  onShowFeedback?: (grant: Grant) => void;
  onSaveEdit?: (grant: Grant) => Promise<boolean | void>;
}

type EditableGrantFields = {
  title: string;
  funderId: string;
  source: Grant['source'];
  amount: string;
  awardFloor: string;
  awardCeiling: string;
  deadline: string;
  submissionDate: string;
  expectedNotificationDate: string;
  pocName: string;
  pocEmail: string;
  internalLead: string;
  applicationStatus: NonNullable<Grant['applicationStatus']>;
  rejectionReason: string;
  feedbackSummary: string;
  denialDate: string;
  expirationDate: string;
  spentAmount: string;
  renewalStatus: NonNullable<Grant['renewalStatus']>;
  complianceCategory: string;
  programManager: string;
  nextReportDue: string;
  onboardingDate: string;
  isExtended: boolean;
  funderPortalUrl: string;
  grantsGovId: string;
};

const badgeIcons: Record<string, React.ReactNode> = {
  applied: <Clock className="h-3.5 w-3.5" />,
  approved: <CheckCircle2 className="h-3.5 w-3.5" />,
  denied: <XCircle className="h-3.5 w-3.5" />,
  withdrawn: <XCircle className="h-3.5 w-3.5" />,
  closed: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const applicationStatuses: NonNullable<Grant['applicationStatus']>[] = [
  'Submitted',
  'Under Review',
  'Interview/Clarification',
];

const fundingSources: Grant['source'][] = ['Federal', 'State', 'Private'];
const renewalStatuses: NonNullable<Grant['renewalStatus']>[] = ['None', 'Initiated', 'Complete'];
const complianceCategories: NonNullable<Grant['complianceCategory']>[] = [
  'Clinical Services',
  'Infrastructure',
  'Workforce Development',
  'Research',
  'Other',
];
const rejectionReasons: NonNullable<Grant['rejectionReason']>[] = [
  'Lack of Matching Funds',
  'Eligibility Technicality',
  'Funder Budget Cut',
  'Proposal Score',
  'Other',
];

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function toEditableFields(grant: Grant): EditableGrantFields {
  return {
    title: grant.title,
    funderId: grant.funderId,
    source: grant.source,
    amount: grant.amount ? String(grant.amount) : '',
    awardFloor: grant.awardFloor != null ? String(grant.awardFloor) : '',
    awardCeiling: grant.awardCeiling != null ? String(grant.awardCeiling) : '',
    deadline: grant.deadline || '',
    submissionDate: grant.submissionDate || '',
    expectedNotificationDate: grant.expectedNotificationDate || '',
    pocName: grant.pocName || '',
    pocEmail: grant.pocEmail || '',
    internalLead: grant.internalLead || '',
    applicationStatus: grant.applicationStatus || 'Submitted',
    rejectionReason: grant.rejectionReason || '',
    feedbackSummary: grant.feedbackSummary || '',
    denialDate: grant.denialDate || '',
    expirationDate: grant.expirationDate || '',
    spentAmount: grant.spentAmount != null ? String(grant.spentAmount) : '',
    renewalStatus: grant.renewalStatus || 'None',
    complianceCategory: grant.complianceCategory || '',
    programManager: grant.programManager || '',
    nextReportDue: grant.nextReportDue || '',
    onboardingDate: grant.onboardingDate || '',
    isExtended: !!grant.isExtended,
    funderPortalUrl: grant.funderPortalUrl || '',
    grantsGovId: grant.grantsGovId || '',
  };
}

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const normalized = Number(value.replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function detailIcon(icon: React.ReactNode, strong = false) {
  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '12px',
        background: strong ? '#FFD21F' : '#FFF7DA',
        boxShadow: strong
          ? '0 8px 18px rgba(255,210,31,0.32)'
          : '0 6px 14px rgba(255,215,0,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  tone = 'navy',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'navy' | 'emerald' | 'slate';
}) {
  const iconTone = tone === 'emerald' ? '#047857' : tone === 'slate' ? '#64748b' : '#002d62';

  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid #d9e2ef',
        background: '#f8fafc',
        padding: '12px 14px',
      }}
    >
      <p
        style={{
          margin: '0 0 6px 0',
          fontSize: '10px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: '#94a3b8',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
        <span style={{ color: iconTone, display: 'flex' }}>{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(multiline = false): React.CSSProperties {
  return {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid #d9e2ef',
    background: '#fff',
    padding: multiline ? '12px 14px' : '11px 14px',
    fontSize: '14px',
    color: '#243F66',
    resize: multiline ? 'vertical' : undefined,
    minHeight: multiline ? '110px' : undefined,
    outline: 'none',
  };
}

const GrantCard: React.FC<GrantCardProps> = ({
  grant,
  onAction,
  onUpdateStatus,
  onReActivate,
  onShowFeedback,
  onSaveEdit,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [draft, setDraft] = useState<EditableGrantFields>(() => toEditableFields(grant));

  useEffect(() => {
    setDraft(toEditableFields(grant));
    setIsEditing(false);
    setIsSavingEdit(false);
    setEditError('');
  }, [grant]);

  const isActiveApplication = grant.status === 'applied' || grant.status === 'available';
  const isUnsuccessful = grant.status === 'denied' || grant.status === 'withdrawn';
  const isApproved = grant.status === 'approved';
  const progressWidth =
    grant.applicationStatus === 'Submitted'
      ? '33%'
      : grant.applicationStatus === 'Under Review'
        ? '66%'
        : '100%';

  const subtitle =
    isActiveApplication
      ? 'AWAITING REVIEW'
      : grant.status === 'approved'
        ? 'FUNDS ALLOCATED'
        : grant.status === 'withdrawn'
          ? 'OPPORTUNITY CLOSED'
          : 'DECISION LOGGED';

  const footerDate =
    grant.status === 'approved'
      ? grant.expirationDate || 'TBD'
      : grant.deadline || grant.expectedNotificationDate || 'Pending';

  const primaryLabel = 'Issuing Agency';
  const secondaryLabel = 'Award Value';
  const grantUrl =
    grant.grantsGovId
      ? `https://www.grants.gov/search-results-detail/${grant.grantsGovId}`
      : grant.funderPortalUrl ||
        `https://www.grants.gov/search-grants?keyword=${encodeURIComponent(grant.funderId)}`;
  const awardValue = grant.awardCeiling ?? grant.amount;
  const hasAwardAmount = awardValue > 0;

  const updateDraft = <K extends keyof EditableGrantFields>(field: K, value: EditableGrantFields[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!onSaveEdit) return;

    const title = draft.title.trim();
    const funderId = draft.funderId.trim();

    if (!title || !funderId) {
      setEditError('Title and grant number are required.');
      return;
    }

    const amount = parseNumber(draft.amount) ?? 0;
    const spentAmount = parseNumber(draft.spentAmount) ?? 0;
    const awardFloor = parseNumber(draft.awardFloor);
    const awardCeiling = parseNumber(draft.awardCeiling);

    const updatedGrant: Grant = {
      ...grant,
      title,
      funderId,
      source: draft.source,
      amount,
      awardFloor,
      awardCeiling,
      deadline: draft.deadline || undefined,
      submissionDate: draft.submissionDate || undefined,
      expectedNotificationDate: draft.expectedNotificationDate || undefined,
      pocName: draft.pocName.trim() || undefined,
      pocEmail: draft.pocEmail.trim() || undefined,
      internalLead: draft.internalLead.trim() || undefined,
      applicationStatus: isActiveApplication ? draft.applicationStatus : undefined,
      rejectionReason: isUnsuccessful ? (draft.rejectionReason as Grant['rejectionReason']) || undefined : undefined,
      feedbackSummary: isUnsuccessful ? draft.feedbackSummary.trim() || undefined : undefined,
      denialDate: isUnsuccessful ? draft.denialDate || undefined : undefined,
      expirationDate: isApproved ? draft.expirationDate || undefined : grant.expirationDate,
      spentAmount: isApproved || grant.spentAmount != null ? spentAmount : grant.spentAmount,
      remainingAmount: amount - spentAmount,
      renewalStatus: isApproved ? draft.renewalStatus : grant.renewalStatus,
      complianceCategory: isApproved ? (draft.complianceCategory as Grant['complianceCategory']) || undefined : undefined,
      programManager: isApproved ? draft.programManager.trim() || undefined : undefined,
      nextReportDue: isApproved ? draft.nextReportDue || undefined : undefined,
      onboardingDate: isApproved ? draft.onboardingDate || undefined : grant.onboardingDate,
      isExtended: isApproved ? draft.isExtended : grant.isExtended,
      funderPortalUrl: draft.funderPortalUrl.trim() || undefined,
      grantsGovId: draft.grantsGovId.trim() || undefined,
    };

    setIsSavingEdit(true);
    setEditError('');

    try {
      const result = await onSaveEdit(updatedGrant);
      if (result === false) {
        setEditError('Failed to save grant changes.');
        return;
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save grant edit:', error);
      setEditError('Failed to save grant changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#fff',
        borderTop: '1px solid #d9e2ef',
        borderRight: '1px solid #d9e2ef',
        borderBottom: '1px solid #d9e2ef',
        borderLeft: `8px solid ${isUnsuccessful ? '#94a3b8' : isApproved ? '#0f8f5b' : '#003366'}`,
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 10px 24px rgba(15,23,42,0.07)',
      }}
    >
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#003366', fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              <Hash className="w-3 h-3" />
              {grant.funderId}
            </div>
            <a
              href={grantUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View Official Opportunity Details"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', maxWidth: '30rem', textDecoration: 'none' }}
            >
              <h3 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, lineHeight: 1.08, color: '#003366' }}>
                {grant.title}
              </h3>
              <ExternalLink className="h-4 w-4" style={{ color: '#003366', flexShrink: 0 }} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {onSaveEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setDraft(toEditableFields(grant));
                      setIsEditing(false);
                      setEditError('');
                      return;
                    }
                    if (!isExpanded) {
                      setIsExpanded(true);
                    }
                    setIsEditing(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '999px',
                    border: '1px solid #d9e2ef',
                    background: isEditing ? '#eff6ff' : '#fff',
                    color: '#003366',
                    padding: '9px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEditing ? 'Editing' : 'Edit'}
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '999px', border: `1px solid ${grant.status === 'approved' ? '#7BE0AC' : '#F2C14E'}`, background: grant.status === 'approved' ? '#DDFBEA' : '#FFF4CC', color: grant.status === 'approved' ? '#0C8C52' : '#B46900', fontSize: '14px', fontWeight: 700, boxShadow: grant.status === 'approved' ? '0 4px 12px rgba(16,185,129,0.18)' : '0 4px 12px rgba(242,193,78,0.28)' }}>
                {badgeIcons[grant.status] ?? badgeIcons.applied}
                {isActiveApplication ? 'PENDING' : grant.status === 'approved' ? 'APPROVED' : grant.status.toUpperCase()}
              </div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: isApproved ? '#11A861' : '#667A98' }}>
              {subtitle}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasAwardAmount ? 2 : 1}, minmax(0, 1fr))`, gap: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            {detailIcon(<Building2 className="w-5 h-5 text-[#003366]" />)}
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#90A4C3' }}>
                {primaryLabel}
              </p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#243F66', lineHeight: 1.35 }}>{grant.source}</p>
            </div>
          </div>

          {hasAwardAmount && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {detailIcon(<Trophy className="w-5 h-5 text-[#003366]" />, true)}
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#90A4C3' }}>
                  {secondaryLabel}
                </p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#003366', lineHeight: 1.35 }}>{formatCurrency(awardValue)}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e8eef6', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock className="w-4 h-4 text-[#003366]" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#516E95' }}>
              {isApproved ? `EXPIRATION: ${footerDate}` : `DEADLINE: ${footerDate}`}
            </span>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#003366', cursor: 'pointer' }}
            >
              View Details
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {(isExpanded || isEditing) && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e8eef6', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isEditing ? (
              <>
                <div style={{ borderRadius: '20px', border: '1px solid #d9e2ef', background: '#f8fafc', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>
                        Edit Grant
                      </p>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#243F66' }}>
                        Update details directly from the card.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(toEditableFields(grant));
                          setIsEditing(false);
                          setEditError('');
                        }}
                        disabled={isSavingEdit}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '11px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', background: '#fff', cursor: 'pointer', opacity: isSavingEdit ? 0.6 : 1 }}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={isSavingEdit}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '14px', border: 'none', padding: '11px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff', background: '#003366', cursor: 'pointer', opacity: isSavingEdit ? 0.7 : 1 }}
                      >
                        {isSavingEdit ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {isSavingEdit ? 'Saving' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {editError && (
                    <div style={{ borderRadius: '14px', border: '1px solid #fecaca', background: '#fef2f2', padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#b91c1c' }}>
                      {editError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <EditField label="Grant Title">
                      <input value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Grant Number">
                      <input value={draft.funderId} onChange={(e) => updateDraft('funderId', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Funding Source">
                      <select value={draft.source} onChange={(e) => updateDraft('source', e.target.value as Grant['source'])} style={inputStyle()}>
                        {fundingSources.map((source) => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                    </EditField>
                    <EditField label="Amount">
                      <input value={draft.amount} onChange={(e) => updateDraft('amount', e.target.value)} inputMode="decimal" style={inputStyle()} />
                    </EditField>
                    <EditField label="Award Floor">
                      <input value={draft.awardFloor} onChange={(e) => updateDraft('awardFloor', e.target.value)} inputMode="decimal" style={inputStyle()} />
                    </EditField>
                    <EditField label="Award Ceiling">
                      <input value={draft.awardCeiling} onChange={(e) => updateDraft('awardCeiling', e.target.value)} inputMode="decimal" style={inputStyle()} />
                    </EditField>
                    <EditField label="Deadline">
                      <input type="date" value={draft.deadline} onChange={(e) => updateDraft('deadline', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Submission Date">
                      <input type="date" value={draft.submissionDate} onChange={(e) => updateDraft('submissionDate', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Expected Notice">
                      <input type="date" value={draft.expectedNotificationDate} onChange={(e) => updateDraft('expectedNotificationDate', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="POC Name">
                      <input value={draft.pocName} onChange={(e) => updateDraft('pocName', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="POC Email">
                      <input type="email" value={draft.pocEmail} onChange={(e) => updateDraft('pocEmail', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Internal Lead">
                      <input value={draft.internalLead} onChange={(e) => updateDraft('internalLead', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Portal URL">
                      <input value={draft.funderPortalUrl} onChange={(e) => updateDraft('funderPortalUrl', e.target.value)} style={inputStyle()} />
                    </EditField>
                    <EditField label="Grants.gov ID">
                      <input value={draft.grantsGovId} onChange={(e) => updateDraft('grantsGovId', e.target.value)} style={inputStyle()} />
                    </EditField>

                    {isActiveApplication && (
                      <EditField label="Application Status">
                        <select value={draft.applicationStatus} onChange={(e) => updateDraft('applicationStatus', e.target.value as EditableGrantFields['applicationStatus'])} style={inputStyle()}>
                          {applicationStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </EditField>
                    )}

                    {isApproved && (
                      <>
                        <EditField label="Expiration Date">
                          <input type="date" value={draft.expirationDate} onChange={(e) => updateDraft('expirationDate', e.target.value)} style={inputStyle()} />
                        </EditField>
                        <EditField label="Spent Amount">
                          <input value={draft.spentAmount} onChange={(e) => updateDraft('spentAmount', e.target.value)} inputMode="decimal" style={inputStyle()} />
                        </EditField>
                        <EditField label="Renewal Status">
                          <select value={draft.renewalStatus} onChange={(e) => updateDraft('renewalStatus', e.target.value as EditableGrantFields['renewalStatus'])} style={inputStyle()}>
                            {renewalStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </EditField>
                        <EditField label="Compliance Category">
                          <select value={draft.complianceCategory} onChange={(e) => updateDraft('complianceCategory', e.target.value)} style={inputStyle()}>
                            <option value="">Not set</option>
                            {complianceCategories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </EditField>
                        <EditField label="Program Manager">
                          <input value={draft.programManager} onChange={(e) => updateDraft('programManager', e.target.value)} style={inputStyle()} />
                        </EditField>
                        <EditField label="Next Report Due">
                          <input type="date" value={draft.nextReportDue} onChange={(e) => updateDraft('nextReportDue', e.target.value)} style={inputStyle()} />
                        </EditField>
                        <EditField label="Onboarding Date">
                          <input type="date" value={draft.onboardingDate} onChange={(e) => updateDraft('onboardingDate', e.target.value)} style={inputStyle()} />
                        </EditField>
                        <EditField label="Extension">
                          <select value={draft.isExtended ? 'yes' : 'no'} onChange={(e) => updateDraft('isExtended', e.target.value === 'yes')} style={inputStyle()}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </EditField>
                      </>
                    )}

                    {isUnsuccessful && (
                      <>
                        <EditField label="Rejection Reason">
                          <select value={draft.rejectionReason} onChange={(e) => updateDraft('rejectionReason', e.target.value)} style={inputStyle()}>
                            <option value="">Not set</option>
                            {rejectionReasons.map((reason) => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </EditField>
                        <EditField label="Decision Date">
                          <input type="date" value={draft.denialDate} onChange={(e) => updateDraft('denialDate', e.target.value)} style={inputStyle()} />
                        </EditField>
                      </>
                    )}
                  </div>

                  {isUnsuccessful && (
                    <EditField label="Feedback Summary">
                      <textarea value={draft.feedbackSummary} onChange={(e) => updateDraft('feedbackSummary', e.target.value)} style={inputStyle(true)} />
                    </EditField>
                  )}
                </div>
              </>
            ) : (
              <>
                {hasAwardAmount && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                    <InfoCard
                      label="Award Value"
                      value={formatCurrency(awardValue)}
                      icon={<Trophy className="h-4 w-4" />}
                      tone={isApproved ? 'emerald' : 'navy'}
                    />
                    <InfoCard
                      label="Award Floor"
                      value={grant.awardFloor ? formatCurrency(grant.awardFloor) : 'Not provided'}
                      icon={<Trophy className="h-4 w-4" />}
                      tone="slate"
                    />
                  </div>
                )}

                {isActiveApplication && (
                  <>
                    <div style={{ borderRadius: '20px', border: '1px solid #d9e2ef', background: '#f8fafc', padding: '16px' }}>
                      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>Status Tracking</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#002d62' }}>{grant.applicationStatus || 'Submitted'}</span>
                      </div>
                      <div style={{ height: '8px', overflow: 'hidden', borderRadius: '999px', background: '#dbe3ee' }}>
                        <div style={{ height: '100%', width: progressWidth, background: '#002d62', transition: 'width 700ms' }} />
                      </div>
                      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>
                        <span>Submitted</span>
                        <span style={{ textAlign: 'center' }}>Under Review</span>
                        <span style={{ textAlign: 'right' }}>Interview</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                      <button
                        onClick={() => onUpdateStatus?.(grant.id, 'denied')}
                        style={{ borderRadius: '14px', border: '1px solid #fecdd3', padding: '12px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e11d48', background: '#fff', cursor: 'pointer' }}
                      >
                        Mark Denied
                      </button>
                      <button
                        onClick={() => onUpdateStatus?.(grant.id, 'withdrawn')}
                        style={{ borderRadius: '14px', border: '1px solid #cbd5e1', padding: '12px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', background: '#fff', cursor: 'pointer' }}
                      >
                        Withdraw
                      </button>
                      <button
                        onClick={() => onUpdateStatus?.(grant.id, 'approved')}
                        style={{ borderRadius: '14px', border: 'none', padding: '12px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff', background: '#047857', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                    </div>
                  </>
                )}

                {isApproved && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                      <InfoCard label="Expiration Date" value={grant.expirationDate || 'No expiration set'} icon={<CalendarClock className="h-4 w-4" />} tone="emerald" />
                      <InfoCard label="Award Amount" value={hasAwardAmount ? formatCurrency(awardValue) : 'Not provided'} icon={<Trophy className="h-4 w-4" />} tone="emerald" />
                    </div>

                    <div style={{ borderRadius: '20px', border: '1px solid #d9e2ef', background: '#f8fafc', padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>Reporting Milestone</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                            <CalendarClock className="h-4 w-4 text-emerald-700" />
                            <span>Next Report Due: {grant.nextReportDue || 'Not scheduled'}</span>
                          </div>
                        </div>
                        <a
                          href={grantUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#047857', textDecoration: 'none' }}
                        >
                          Open Portal
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '8px' }}>
                      <button
                        onClick={() => onAction?.(grant.id, 'close')}
                        style={{ borderRadius: '14px', border: '1px solid #cbd5e1', padding: '12px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', background: '#fff', cursor: 'pointer' }}
                      >
                        Closeout Checklist
                      </button>
                    </div>
                  </>
                )}

                {isUnsuccessful && (
                  <>
                    <div style={{ borderRadius: '20px', border: '1px dashed #cbd5e1', background: '#f8fafc', padding: '16px', fontSize: '14px', lineHeight: 1.6, color: '#475569' }}>
                      <strong style={{ marginRight: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>Decision Note</strong>
                      {grant.rejectionReason || 'No decision note recorded.'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                      <button
                        onClick={() => onShowFeedback?.(grant)}
                        style={{ borderRadius: '14px', border: '1px solid #cbd5e1', padding: '12px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', background: '#fff', cursor: 'pointer' }}
                      >
                        View Feedback
                      </button>
                      <button
                        onClick={() => onReActivate?.(grant.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '14px', border: 'none', padding: '12px 14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff', background: '#C5B358', cursor: 'pointer' }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Re-Activate Opportunity
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#002d62', cursor: 'pointer', width: 'fit-content' }}
                >
                  Hide Details
                  <ChevronUp className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GrantCard;
