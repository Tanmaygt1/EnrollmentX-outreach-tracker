import { OutreachLog, TeamMemberStats, TEAM_MEMBERS } from '@/types';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

export type Period = 'all' | 'week' | 'month';

function filterByPeriod(logs: OutreachLog[], period: Period): OutreachLog[] {
  if (period === 'all') return logs;
  return logs.filter(log => {
    try {
      const date = parseISO(log.timestamp);
      if (period === 'week') return isThisWeek(date, { weekStartsOn: 1 });
      if (period === 'month') return isThisMonth(date);
    } catch { return false; }
    return true;
  });
}

export function computeStats(logs: OutreachLog[], period: Period = 'all') {
  const filtered = filterByPeriod(logs, period);
  const totalOutreach = filtered.length;
  const todayOutreach = logs.filter(l => {
    try { return isToday(parseISO(l.timestamp)); } catch { return false; }
  }).length;
  const goodReplies = filtered.filter(l => ['Replied', 'Interested', 'Booked'].includes(l.status)).length;
  const bookings    = filtered.filter(l => l.status === 'Booked').length;
  const rejections  = filtered.filter(l => l.status === 'Rejected').length;
  const replyRate   = totalOutreach > 0 ? Math.round((goodReplies / totalOutreach) * 100) : 0;
  return { totalOutreach, todayOutreach, goodReplies, bookings, rejections, replyRate };
}

export function computeTeamStats(logs: OutreachLog[], period: Period = 'all'): TeamMemberStats[] {
  const filtered = filterByPeriod(logs, period);
  return TEAM_MEMBERS.map(name => {
    const ml = filtered.filter(l => l.teamMemberName === name);
    const totalOutreach = ml.length;
    const replies    = ml.filter(l => ['Replied', 'Interested', 'Booked'].includes(l.status)).length;
    const bookings   = ml.filter(l => l.status === 'Booked').length;
    const rejections = ml.filter(l => l.status === 'Rejected').length;
    const ignored    = ml.filter(l => l.status === 'DMed').length;
    const replyRate  = totalOutreach > 0 ? Math.round((replies / totalOutreach) * 100) : 0;
    return { name, totalOutreach, replies, bookings, rejections, ignored, leftOnRead: ignored, replyRate };
  }).sort((a, b) => b.bookings - a.bookings || b.replies - a.replies || b.replyRate - a.replyRate);
}
