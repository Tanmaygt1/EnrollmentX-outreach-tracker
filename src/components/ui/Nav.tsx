'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, createContext, useContext } from 'react';
import { TEAM_MEMBERS } from '@/types';
import LogOutreachModal from './LogOutreachModal';

// ── Active member context so PipelineBoard can read it ──
interface ActiveMemberCtx {
  activeMember: string;
  setActiveMember: (m: string) => void;
}
const Ctx = createContext<ActiveMemberCtx>({
  activeMember: TEAM_MEMBERS[0],
  setActiveMember: () => {},
});

export function useActiveMember() { return useContext(Ctx); }

export function ActiveMemberProvider({ children }: { children: React.ReactNode }) {
  const [activeMember, setActiveMember] = useState(TEAM_MEMBERS[0]);
  return <Ctx.Provider value={{ activeMember, setActiveMember }}>{children}</Ctx.Provider>;
}

const TABS = [
  { label: 'Pipeline',  href: '/pipeline' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Team',      href: '/team' },
];

export default function Nav() {
  const pathname = usePathname();
  const [showLog, setShowLog] = useState(false);
  const { activeMember, setActiveMember } = useActiveMember();

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '0 20px',
        height: '52px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', gap: '4px', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700,
          color: 'var(--accent)', letterSpacing: '-0.5px', marginRight: '20px',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <span className="animate-pulse-dot" style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
          }} />
          PULSE
        </div>

        {/* Tabs */}
        {TABS.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{
              padding: '6px 14px', borderRadius: '6px',
              color: active ? 'var(--accent)' : 'var(--text2)',
              background: active ? 'rgba(79,196,207,.1)' : 'transparent',
              fontSize: '13px', fontWeight: 500, textDecoration: 'none',
              transition: 'all .15s',
            }}>
              {tab.label}
            </Link>
          );
        })}

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* "I am…" picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>I am</span>
            <select
              value={activeMember}
              onChange={e => setActiveMember(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: '20px',
                border: '1px solid var(--border2)', background: 'var(--surface2)',
                color: 'var(--text)', fontSize: '12px', cursor: 'pointer',
                fontFamily: 'var(--font-main)', fontWeight: 500,
              }}
            >
              {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <button
            onClick={() => setShowLog(true)}
            style={{
              padding: '7px 14px', background: 'var(--accent)', color: '#0d0f12',
              borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            + Log Outreach
          </button>
        </div>
      </nav>

      {showLog && (
        <LogOutreachModal activeMember={activeMember} onClose={() => setShowLog(false)} />
      )}
    </>
  );
}
