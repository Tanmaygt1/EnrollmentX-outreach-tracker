'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, createContext, useContext, useEffect } from 'react';
import { TEAM_MEMBERS } from '@/types';
import LogOutreachModal from './LogOutreachModal';

// ── Active member context ──────────────────────────────────────────
interface ActiveMemberCtx {
  activeMember: string;
  setActiveMember: (m: string) => void;
}
const Ctx = createContext<ActiveMemberCtx>({
  activeMember: '',
  setActiveMember: () => {},
});

export function useActiveMember() { return useContext(Ctx); }

const STORAGE_KEY = 'pulse_active_member';

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  Aman:  { bg: 'rgba(99,102,241,.25)',  color: '#818cf8' },
  Priya: { bg: 'rgba(16,185,129,.2)',   color: '#34d399' },
  Raj:   { bg: 'rgba(245,158,11,.2)',   color: '#fbbf24' },
  Sneha: { bg: 'rgba(239,68,68,.2)',    color: '#f87171' },
  Kavya: { bg: 'rgba(59,130,246,.2)',   color: '#60a5fa' },
};
function getAv(name: string) {
  return AVATAR_COLORS[name] ?? { bg: 'rgba(79,196,207,.2)', color: 'var(--accent)' };
}

export function ActiveMemberProvider({ children }: { children: React.ReactNode }) {
  // Start with empty string — splash shows until user picks
  const [activeMember, setActiveMemberState] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // On mount, restore from sessionStorage (clears when tab closes)
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? '';
    if (stored && TEAM_MEMBERS.includes(stored)) {
      setActiveMemberState(stored);
    }
    setHydrated(true);
  }, []);

  function setActiveMember(m: string) {
    setActiveMemberState(m);
    sessionStorage.setItem(STORAGE_KEY, m);
  }

  // Don't render anything until we've checked sessionStorage
  if (!hydrated) return null;

  // Show blocking splash until a member is chosen
  if (!activeMember) {
    return (
      <MemberSelectSplash onSelect={m => { setActiveMember(m); }} />
    );
  }

  return (
    <Ctx.Provider value={{ activeMember, setActiveMember }}>
      {children}
    </Ctx.Provider>
  );
}

// ── Splash screen ──────────────────────────────────────────────────
function MemberSelectSplash({ onSelect }: { onSelect: (m: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700,
        color: 'var(--accent)', letterSpacing: '-0.5px', marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: 'var(--accent)', display: 'inline-block',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        PULSE
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '36px' }}>
        Who are you today?
      </p>

      {/* Member grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(TEAM_MEMBERS.length, 3)}, 1fr)`,
        gap: '12px',
        maxWidth: '420px',
        width: '100%',
        padding: '0 24px',
      }}>
        {TEAM_MEMBERS.map(name => {
          const av = getAv(name);
          const isHov = hovered === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '10px',
                padding: '20px 16px',
                background: isHov ? av.bg : 'var(--surface)',
                border: isHov ? `1px solid ${av.color}` : '1px solid var(--border)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all .15s',
                fontFamily: 'var(--font-main)',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: av.bg, color: av.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700,
                border: isHov ? `2px solid ${av.color}` : '2px solid transparent',
                transition: 'all .15s',
              }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                color: isHov ? 'var(--text)' : 'var(--text2)',
                transition: 'color .15s',
              }}>
                {name}
              </span>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '28px' }}>
        This resets when you close the tab.
      </p>
    </div>
  );
}

// ── Nav bar ────────────────────────────────────────────────────────
const TABS = [
  { label: 'Pipeline',  href: '/pipeline' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Team',      href: '/team' },
];

export default function Nav() {
  const pathname = usePathname();
  const [showLog, setShowLog] = useState(false);
  const { activeMember, setActiveMember } = useActiveMember();
  const av = getAv(activeMember);

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

          {/* Active member pill — click to switch */}
          <button
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setActiveMember('');
            }}
            title="Switch user"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 12px 4px 6px',
              borderRadius: '20px',
              border: '1px solid var(--border2)',
              background: 'var(--surface2)',
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = av.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          >
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: av.bg, color: av.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700,
            }}>
              {activeMember.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
              {activeMember}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: '2px' }}>↓</span>
          </button>

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