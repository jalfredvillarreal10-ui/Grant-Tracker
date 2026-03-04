export type GrantStatus = 'available' | 'applied' | 'approved' | 'archived';
export type FundingSource = 'Federal' | 'State' | 'Private';

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

  // Portfolio (Approved)
  expirationDate?: string;
  remainingAmount?: number;
  renewalStatus?: 'None' | 'Initiated' | 'Complete';
}
