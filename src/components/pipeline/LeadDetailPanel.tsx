'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lead, STAGES, TEAM_MEMBERS, STAGE_COLORS } from '@/types';
import { X, MessageCircle, Instagram, Mail, ExternalLink } from 'lucide-react';

interface Props {
  lead: Lead;
  activeMember: string;
  onClose: () => void;
}

export default function LeadDetailPanel({ lead, activeMember, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...lead });
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm({ ...lead }); setSaved(false); }, [lead.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const stageChanged = form.stage !== lead.stage;
      const res = await fetch(`/api/leads/${lead.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            stage:      form.stage,
            notes:      form.notes,
            assignedTo: form.assignedTo,
            dmed:       form.dmed,
            dateOfDm:   form.dateOfDm,
            dmedBy:     form.dmedBy,
            replied:    form.replied,
            interested: form.interested,
            followUp1:  form.followUp1,
            followUp2:  form.followUp2,
            followUp3:  form.followUp3,
          },
          ...(stageChanged ? {
            logEntry: {
              teamMemberName: activeMember,
              leadName: lead.fullName,
              platform: 'Manual',
              status: form.stage,
              notes: form.notes,
            },
          } : {}),
        }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['outreach'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const waHref = `https://wa.me/${(lead.phoneCountryCode + lead.phoneNumber).replace(/[^0-9]/g, '')}`;
  const hasPhone = lead.phoneNumber.trim().length > 0;
  const hasIg    = lead.profileLink.trim().length > 0;
  const hasEmail = lead.email.trim().length > 0;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-main)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: 'var(--text2)',
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '5px',
  };

  return (
    <>
      <div className="animate-fade-in" onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 90,
      }} />

      <div className="animate-slide-in" style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border2)',
        zIndex: 91, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.3 }}>{lead.fullName}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{lead.email || '—'}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Contact buttons */}
        <div style={{ display: 'flex', gap: '6px', margin: '12px 0 18px', flexWrap: 'wrap' }}>
          {hasPhone && (
            <a href={waHref} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(37,211,102,.1)', border: '1px solid rgba(37,211,102,.3)',
              color: '#25d166', textDecoration: 'none',
            }}>
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          {hasIg && (
            <a href={lead.profileLink.startsWith('http') ? lead.profileLink : `https://instagram.com/${lead.profileLink.replace('@','')}`}
              target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(195,42,163,.1)', border: '1px solid rgba(195,42,163,.3)',
              color: '#e040fb', textDecoration: 'none',
            }}>
              <Instagram size={13} /> Instagram
            </a>
          )}
          {hasEmail && (
            <a href={`mailto:${lead.email}`} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(79,196,207,.1)', border: '1px solid rgba(79,196,207,.3)',
              color: 'var(--accent)', textDecoration: 'none',
            }}>
              <Mail size={13} /> Email
            </a>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }} />

        {/* Stage */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Stage</label>
          <select style={inputStyle} value={form.stage}
            onChange={e => setForm(f => ({ ...f, stage: e.target.value as any }))}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {form.stage !== lead.stage && (
            <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STAGE_COLORS[form.stage] }} />
              Moving from <strong style={{ color: STAGE_COLORS[lead.stage] }}>{lead.stage}</strong>
              {' → '}
              <strong style={{ color: STAGE_COLORS[form.stage] }}>{form.stage}</strong>
            </div>
          )}
        </div>

        {/* Assigned To */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Assigned To</label>
          <select style={inputStyle} value={form.assignedTo}
            onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
            <option value="">Unassigned</option>
            {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, resize: 'none', height: '80px' }}
            placeholder="Add notes…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* Outreach details */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '14px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Outreach Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { key: 'dmed',      label: 'DMed?',      opts: ['', 'Yes', 'No'] },
              { key: 'replied',   label: 'Replied?',   opts: ['', 'Yes', 'No'] },
              { key: 'interested',label: 'Interested?', opts: ['', 'Yes', 'No'] },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <label style={{ ...labelStyle, marginBottom: '4px' }}>{label}</label>
                <select style={inputStyle} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                  {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ ...labelStyle, marginBottom: '4px' }}>DMed By</label>
              <select style={inputStyle} value={form.dmedBy}
                onChange={e => setForm(f => ({ ...f, dmedBy: e.target.value }))}>
                <option value="">—</option>
                {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <label style={{ ...labelStyle, marginBottom: '4px' }}>Date of DM</label>
            <input type="date" style={inputStyle} value={form.dateOfDm}
              onChange={e => setForm(f => ({ ...f, dateOfDm: e.target.value }))} />
          </div>
        </div>

        {/* Follow-ups */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Follow-up Dates</p>
          {(['followUp1', 'followUp2', 'followUp3'] as const).map((key, i) => (
            <div key={key} style={{ marginBottom: '7px' }}>
              <label style={{ ...labelStyle, marginBottom: '4px' }}>Follow-up {i + 1}</label>
              <input type="date" style={inputStyle} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>

        {/* Read-only contact info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Contact Info</p>
          {[
            { label: 'Phone', value: [lead.phoneCountryCode, lead.phoneNumber].filter(Boolean).join(' ') || '—' },
            { label: 'Email', value: lead.email || '—' },
            { label: 'Profile', value: lead.profileLink || '—', isLink: true },
          ].map(({ label, value, isLink }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{label}</span>
              {isLink && value !== '—' ? (
                <a href={value.startsWith('http') ? value : `https://${value}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {value.length > 24 ? value.slice(0, 24) + '…' : value}
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text)', maxWidth: '190px', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          style={{
            width: '100%', padding: '11px',
            background: saved ? 'rgba(34,197,94,.2)' : 'var(--accent)',
            color: saved ? '#22c55e' : '#0d0f12',
            border: saved ? '1px solid rgba(34,197,94,.4)' : 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            transition: 'all .2s', fontFamily: 'var(--font-main)',
          }}
        >
          {mutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {mutation.isError && (
          <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            Failed to save. Please try again.
          </p>
        )}
      </div>
    </>
  );
}
