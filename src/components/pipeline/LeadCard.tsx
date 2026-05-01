'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead, STAGE_COLORS, Stage } from '@/types';
import { MessageCircle, Instagram, Mail, Zap } from 'lucide-react';

interface Props {
  lead: Lead;
  onClick: () => void;
  isVacant?: boolean;   // shown in the vacant grid — has Claim button
  isClaimed?: boolean;  // in Claimed column — WA/IG/Email trigger DMed move
  activeMember: string;
  onClaim?: (lead: Lead) => void;
  onOutreach?: (lead: Lead, platform: 'wa' | 'ig' | 'email') => void;
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

export default function LeadCard({
  lead, onClick, isVacant, isClaimed, activeMember, onClaim, onOutreach,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, disabled: !!isVacant });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isVacant ? 'pointer' : isDragging ? 'grabbing' : 'grab',
  };

  const stageColor = isVacant ? '#6366f1'
    : (STAGE_COLORS[lead.stage as Stage] ?? '#4fc4cf');

  const waHref = `https://wa.me/${(lead.phoneCountryCode + lead.phoneNumber).replace(/[^0-9]/g, '')}`;
  const hasPhone = lead.phoneNumber.trim().length > 0;
  const hasIg    = lead.profileLink.trim().length > 0;
  const hasEmail = lead.email.trim().length > 0;

  const igHref = lead.profileLink.startsWith('http')
    ? lead.profileLink
    : `https://instagram.com/${lead.profileLink.replace('@', '')}`;

  // For Claimed cards: clicking outreach button opens link AND fires move to DMed
  function handleOutreachClick(
    e: React.MouseEvent,
    platform: 'wa' | 'ig' | 'email',
    href: string,
  ) {
    if (isClaimed && onOutreach) {
      e.preventDefault();
      window.open(href, '_blank', 'noreferrer');
      onOutreach(lead, platform);
    }
    // else: let the <a> do its default navigation
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--surface)',
        border: isVacant
          ? '1px solid rgba(99,102,241,.25)'
          : isClaimed
            ? '1px solid rgba(167,139,250,.3)'
            : '1px solid var(--border)',
        borderRadius: '10px',
        padding: '11px',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.3)';
        (e.currentTarget as HTMLDivElement).style.borderColor = isVacant
          ? 'rgba(99,102,241,.5)'
          : isClaimed
            ? 'rgba(167,139,250,.6)'
            : 'var(--border2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = isVacant
          ? 'rgba(99,102,241,.25)'
          : isClaimed
            ? 'rgba(167,139,250,.3)'
            : 'var(--border)';
      }}
      {...(!isVacant ? { ...attributes, ...listeners } : {})}
    >
      {/* Stage colour bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: stageColor }} />

      {/* Name */}
      <div
        onClick={e => { e.stopPropagation(); onClick(); }}
        style={{
          fontSize: '13px', fontWeight: 600, color: 'var(--text)',
          marginBottom: '7px', marginTop: '4px', lineHeight: 1.3, cursor: 'pointer',
        }}
      >
        {lead.fullName}
      </div>

      {/* Contact buttons */}
      <div
        style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}
        onPointerDown={e => e.stopPropagation()}
      >
        {hasPhone && (
          <a
            href={waHref} target="_blank" rel="noreferrer"
            title={isClaimed ? 'Send DM → moves to DMed' : `${lead.phoneCountryCode} ${lead.phoneNumber}`}
            onClick={e => handleOutreachClick(e, 'wa', waHref)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
              background: isClaimed ? 'rgba(37,211,102,.18)' : 'rgba(37,211,102,.1)',
              border: isClaimed ? '1px solid rgba(37,211,102,.5)' : '1px solid rgba(37,211,102,.3)',
              color: '#25d166', textDecoration: 'none',
            }}>
            <MessageCircle size={11} /> WA{isClaimed ? ' →' : ''}
          </a>
        )}
        {hasIg && (
          <a
            href={igHref} target="_blank" rel="noreferrer"
            title={isClaimed ? 'Send DM → moves to DMed' : lead.profileLink}
            onClick={e => handleOutreachClick(e, 'ig', igHref)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
              background: isClaimed ? 'rgba(195,42,163,.18)' : 'rgba(195,42,163,.1)',
              border: isClaimed ? '1px solid rgba(195,42,163,.5)' : '1px solid rgba(195,42,163,.3)',
              color: '#e040fb', textDecoration: 'none',
            }}>
            <Instagram size={11} /> IG{isClaimed ? ' →' : ''}
          </a>
        )}
        {hasEmail && (
          <a
            href={`mailto:${lead.email}`}
            title={isClaimed ? 'Send email → moves to DMed' : lead.email}
            onClick={e => handleOutreachClick(e, 'email', `mailto:${lead.email}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
              background: isClaimed ? 'rgba(79,196,207,.18)' : 'rgba(79,196,207,.1)',
              border: isClaimed ? '1px solid rgba(79,196,207,.5)' : '1px solid rgba(79,196,207,.3)',
              color: 'var(--accent)', textDecoration: 'none',
            }}>
            <Mail size={11} /> ✉{isClaimed ? ' →' : ''}
          </a>
        )}
      </div>

      {/* Footer: Claim button (vacant) or owner badge (pipeline) */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        onPointerDown={e => e.stopPropagation()}
      >
        {isVacant ? (
          <button
            onClick={e => { e.stopPropagation(); onClaim?.(lead); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '6px',
              background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.35)',
              color: '#818cf8', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-main)', transition: 'all .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,.15)')}
          >
            <Zap size={11} /> Claim
          </button>
        ) : lead.dmedBy ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text3)' }}>
            {(() => {
              const av = getAv(lead.dmedBy);
              return (
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: av.bg, color: av.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 600,
                }}>
                  {lead.dmedBy.slice(0, 2).toUpperCase()}
                </div>
              );
            })()}
            {lead.dmedBy}
          </div>
        ) : null}
      </div>

      {lead.notes && (
        <div style={{
          fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic',
          marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lead.notes}
        </div>
      )}
    </div>
  );
}