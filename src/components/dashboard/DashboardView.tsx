'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TeamMemberStats, TEAM_MEMBERS } from '@/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

type Period = 'all' | 'week' | 'month';

interface OutreachData {
  stats: {
    totalOutreach: number;
    todayOutreach: number;
    goodReplies: number;
    bookings: number;
    rejections: number;
    replyRate: number;
  };
  teamStats: TeamMemberStats[];
  recentActivity: Array<{
    id: string;
    timestamp: string;
    teamMemberName: string;
    leadName: string;
    platform: string;
    status: string;
    notes: string;
  }>;
}

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

const STATUS_COLORS: Record<string, string> = {
  Booked: '#22c55e', Interested: '#10b981', Replied: '#3b82f6',
  DMed: '#f59e0b', Rejected: '#ef4444', 'New Lead': '#6366f1',
};

export default function DashboardView() {
  const [period, setPeriod] = useState<Period>('all');

  const { data, isLoading } = useQuery<OutreachData>({
    queryKey: ['outreach', period],
    queryFn: () => fetch(`/api/outreach?period=${period}`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const stats = data?.stats;
  const teamStats = data?.teamStats ?? [];
  const activity = data?.recentActivity ?? [];

  const kpis = [
    { label: 'Total Outreach',  value: stats?.totalOutreach ?? 0,  color: 'var(--text)' },
    { label: "Today's Outreach", value: stats?.todayOutreach ?? 0, color: 'var(--accent)' },
    { label: 'Good Replies',    value: stats?.goodReplies ?? 0,     color: '#3b82f6' },
    { label: 'Bookings',        value: stats?.bookings ?? 0,        color: '#22c55e' },
    { label: 'Rejections',      value: stats?.rejections ?? 0,      color: '#ef4444' },
    { label: 'Reply Rate',      value: `${stats?.replyRate ?? 0}%`, color: 'var(--accent)' },
  ];

  const maxOutreach = Math.max(...teamStats.map(t => t.totalOutreach), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      {/* Period toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['all', 'week', 'month'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: period === p ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: period === p ? 'var(--accent)' : 'var(--text2)',
            background: period === p ? 'rgba(79,196,207,.08)' : 'none',
            cursor: 'pointer', fontFamily: 'var(--font-main)',
          }}>
            {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
        {kpis.map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '14px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
              {label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>
              {isLoading ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Leaderboard */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)', marginBottom: '14px' }}>
            Leaderboard
          </div>
          {isLoading ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
          ) : teamStats.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>No outreach logged yet.</div>
          ) : (
            teamStats.map((member, i) => {
              const av = getAv(member.name);
              return (
                <div key={member.name} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 0', borderBottom: i < teamStats.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', width: '14px' }}>
                    {i + 1}
                  </span>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: av.bg, color: av.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 600, flexShrink: 0,
                  }}>
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{member.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'right' }}>
                    {member.totalOutreach} · {member.replies} · {member.bookings}
                  </span>
                  <div style={{ width: '60px' }}>
                    <div style={{ height: '4px', background: 'var(--surface3)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px', background: 'var(--accent)',
                        width: `${Math.round((member.totalOutreach / maxOutreach) * 100)}%`,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '10px' }}>
            outreach · replies · bookings
          </p>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)', marginBottom: '14px' }}>
            Live Activity
          </div>
          {isLoading ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading…</div>
          ) : activity.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>No activity yet.</div>
          ) : (
            activity.slice(0, 8).map((item, i) => {
              const av = getAv(item.teamMemberName);
              let timeAgo = '';
              try { timeAgo = formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true }); } catch {}
              return (
                <div key={item.id} style={{
                  display: 'flex', gap: '10px', padding: '7px 0',
                  borderBottom: i < Math.min(activity.length, 8) - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: av.bg, color: av.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, flexShrink: 0,
                  }}>
                    {item.teamMemberName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--text)' }}>{item.teamMemberName}</strong>
                      {' moved '}
                      <strong style={{ color: 'var(--text)' }}>{item.leadName}</strong>
                      {' to '}
                      <span style={{ color: STATUS_COLORS[item.status] ?? 'var(--accent)' }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                      {timeAgo}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
