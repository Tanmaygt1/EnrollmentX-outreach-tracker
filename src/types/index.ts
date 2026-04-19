export type Stage = 'New Lead' | 'DMed' | 'Replied' | 'Interested' | 'Booked' | 'Rejected';

export interface Lead {
  rowIndex: number;    // 1-based row in Google Sheet
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  profileLink: string;
  dmed: string;        // 'Yes' | 'No' | ''  — from "DMed?" column
  dateOfDm: string;
  dmedBy: string;      // team member name — from "DMed by?" column (the "claimed by" field)
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
export const TEAM_MEMBERS = ['Tanmay', 'Charan', 'Harsh', 'Shivani', 'Samyak'];

export const STAGES: Stage[] = ['New Lead', 'DMed', 'Replied', 'Interested', 'Booked', 'Rejected'];

export const STAGE_COLORS: Record<Stage, string> = {
  'New Lead':   '#6366f1',
  'DMed':       '#f59e0b',
  'Replied':    '#3b82f6',
  'Interested': '#10b981',
  'Booked':     '#22c55e',
  'Rejected':   '#ef4444',
};

export const STAGE_BG: Record<Stage, string> = {
  'New Lead':   'rgba(99,102,241,0.12)',
  'DMed':       'rgba(245,158,11,0.12)',
  'Replied':    'rgba(59,130,246,0.12)',
  'Interested': 'rgba(16,185,129,0.12)',
  'Booked':     'rgba(34,197,94,0.12)',
  'Rejected':   'rgba(239,68,68,0.12)',
};

export const PLATFORMS = ['WhatsApp', 'Instagram DM', 'Email', 'LinkedIn', 'Other'];

/**
 * A lead is VACANT (unclaimed) if:
 *   - "DMed?" column is empty or "No"          (not yet sent a DM)
 *   - "DMed by?" column is empty               (no one has claimed it)
 *   - Stage is "New Lead" or blank             (hasn't been progressed)
 *
 * ANY of these being filled means the lead is claimed / in progress.
 */
export function isVacant(lead: Lead): boolean {
  const dmedYes   = lead.dmed.trim().toLowerCase() === 'yes';
  const hasOwner  = lead.dmedBy.trim() !== '';
  const hasStage  = lead.stage !== 'New Lead' && lead.stage !== ('' as Stage);
  return !dmedYes && !hasOwner && !hasStage;
}

/**
 * A lead is "owned by" a team member if they DMed it or it's assigned to them.
 * These leads appear in that member's personal pipeline kanban.
 */
export function isOwnedBy(lead: Lead, member: string): boolean {
  const m = member.trim().toLowerCase();
  return (
    lead.dmedBy.trim().toLowerCase()    === m ||
    lead.assignedTo.trim().toLowerCase() === m
  );
}
