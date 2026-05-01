export type Stage = 'New Lead' | 'Claimed' | 'DMed' | 'Replied' | 'Interested' | 'Booked' | 'Rejected';

export interface Lead {
  rowIndex: number;
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  profileLink: string;
  dmed: string;
  dateOfDm: string;
  dmedBy: string;
  replied: string;
  interested: string;
  followUp1: string;
  followUp2: string;
  followUp3: string;
  stage: Stage;
  notes: string;
  assignedTo: string;
}

export interface OutreachLog {
  id: string;
  timestamp: string;
  teamMemberName: string;
  leadName: string;
  platform: string;
  status: string;
  notes: string;
}

export interface TeamMemberStats {
  name: string;
  totalOutreach: number;
  replies: number;
  bookings: number;
  rejections: number;
  ignored: number;
  leftOnRead: number;
  replyRate: number;
}

// ── Edit this one array to add/remove team members everywhere ──
export const TEAM_MEMBERS = ['Tanmay', 'Harsh', 'Charan', 'Samyak', 'Shivani'];

export const STAGES: Stage[] = [
  'New Lead', 'Claimed', 'DMed', 'Replied', 'Interested', 'Booked', 'Rejected',
];

// Stages shown in the pipeline kanban (New Lead stays in the vacant pool)
export const PIPELINE_STAGES: Stage[] = [
  'Claimed', 'DMed', 'Replied', 'Interested', 'Booked', 'Rejected',
];

export const STAGE_COLORS: Record<Stage, string> = {
  'New Lead':   '#6366f1',
  'Claimed':    '#a78bfa',
  'DMed':       '#f59e0b',
  'Replied':    '#3b82f6',
  'Interested': '#10b981',
  'Booked':     '#22c55e',
  'Rejected':   '#ef4444',
};

export const STAGE_BG: Record<Stage, string> = {
  'New Lead':   'rgba(99,102,241,0.12)',
  'Claimed':    'rgba(167,139,250,0.12)',
  'DMed':       'rgba(245,158,11,0.12)',
  'Replied':    'rgba(59,130,246,0.12)',
  'Interested': 'rgba(16,185,129,0.12)',
  'Booked':     'rgba(34,197,94,0.12)',
  'Rejected':   'rgba(239,68,68,0.12)',
};

export const PLATFORMS = ['WhatsApp', 'Instagram DM', 'Email', 'LinkedIn', 'Other'];

/** Vacant = no one has claimed or DMed this lead yet */
export function isVacant(lead: Lead): boolean {
  const dmedYes  = lead.dmed.trim().toLowerCase() === 'yes';
  const hasOwner = lead.dmedBy.trim() !== '';
  const progressed = lead.stage !== 'New Lead' && lead.stage !== ('' as Stage);
  return !dmedYes && !hasOwner && !progressed;
}

/** Owned = this member claimed or was assigned this lead */
export function isOwnedBy(lead: Lead, member: string): boolean {
  const m = member.trim().toLowerCase();
  return (
    lead.dmedBy.trim().toLowerCase()     === m ||
    lead.assignedTo.trim().toLowerCase() === m
  );
}