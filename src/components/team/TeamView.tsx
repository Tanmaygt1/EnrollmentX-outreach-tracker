'use client';
import { useQuery } from '@tanstack/react-query';
import { TEAM_MEMBERS, TeamMemberStats } from '@/types';

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  Aman:  { bg: 'rgba(99,102,241,.2)',  color: '#818cf8' },
  Priya: { bg: 'rgba(16,185,129,.15)', color: '#34d399' },
  Raj:   { bg: 'rgba(245,158,11,.15)', color: '#fbbf24' },
  Sneha: { bg: 'rgba(239,68,68,.15)',  color: '#f87171' },
  Kavya: { bg: 'rgba(59,130,246,.15)', color: '#60a5fa' },
};
function getAv(name: string) {
  return AVATAR_COLORS[name] ?? { bg: 'rgba(79,196,207,.15)', color: 'var(--accent)' };
}

export default function TeamView() {
  const { data, isLoading } = useQuery<{ teamStats: TeamMemberStats[] }>({
    queryKey: ['outreach', 'all'],
    queryFn: () => fetch('/api/outreach?period=all').then(r => r.json()),
  });

  const teamStats = data?.teamStats ?? [];

  // Build a map for quick lookup
  const statsMap = Object.fromEntries(teamStats.map(s => [s.name, s]));

  const msStyle = {
    background: 'var(--surface2)', borderRadius: '7px',
    padding: '8px', textAlign: 'center' as const,
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '14px', padding: '20px', flex: 1, overflowY: 'auto', alignContent: 'start',
    }}>
      {TEAM_MEMBERS.map(name => {
        const s = statsMap[name];
        const av = getAv(name);
        return (
          <div key={name} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '18px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: av.bg, color: av.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 600, flexShrink: 0,
              }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Team Member</div>
              </div>
              {s && (
                <div style={{
                  marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                  padding: '4px 10px', borderRadius: '20px',
                  background: 'rgba(79,196,207,.1)', color: 'var(--accent)',
                  border: '1px solid rgba(79,196,207,.2)',
                }}>
                  {s.replyRate}% rate
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
            ) : !s ? (
              <div style={{ color: 'var(--text3)', fontSize: '13px' }}>No outreach logged yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { val: s.totalOutreach, label: 'Outreach', color: 'var(--accent)' },
                  { val: s.replies,       label: 'Replies',  color: '#3b82f6' },
                  { val: s.bookings,      label: 'Booked',   color: '#22c55e' },
                  { val: s.rejections,    label: 'Rejected', color: '#ef4444' },
                  { val: s.leftOnRead,    label: 'Read',     color: 'var(--text2)' },
                  { val: `${s.replyRate}%`, label: 'Reply %', color: 'var(--accent)' },
                ].map(({ val, label, color }) => (
                  <div key={label} style={msStyle}>
                    <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>
                      {val}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
