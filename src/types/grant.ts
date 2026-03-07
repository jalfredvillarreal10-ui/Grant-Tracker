export type GrantStatus = 'available' | 'applied' | 'approved' | 'archived' | 'denied' | 'withdrawn' | 'closed';
export type FundingSource = 'Federal' | 'State' | 'Private';
export type ComplianceCategory = 'Clinical Services' | 'Infrastructure' | 'Workforce Development' | 'Research' | 'Other';

export interface Grant {
  id: string;
  title: string;
  funderId: string;
  source: FundingSource;
  amount: number; // For portfolio, this is total award
  awardFloor?: number;
  awardCeiling?: number;
  status: GrantStatus;
  
  // Discovery (Available)
  deadline?: string; 
  
  // Lifecycle (Applied)
  submissionDate?: string;
  expectedNotificationDate?: string;
  pocName?: string;
  pocEmail?: string;
  internalLead?: string;
  applicationStatus?: 'Submitted' | 'Under Review' | 'Interview/Clarification';

  // Unsuccessful (Denied/Withdrawn)
  rejectionReason?: 'Lack of Matching Funds' | 'Eligibility Technicality' | 'Funder Budget Cut' | 'Proposal Score' | 'Other';
  feedbackSummary?: string;
  denialDate?: string;

  // Portfolio (Approved)
  expirationDate?: string;
  spentAmount?: number;
  remainingAmount?: number;
  renewalStatus?: 'None' | 'Initiated' | 'Complete';
  complianceCategory?: ComplianceCategory;
  programManager?: string;
  nextReportDue?: string;
  onboardingDate?: string; // To track "Recently Awarded" (90 days)
  isExtended?: boolean;
}
