'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TEAM_MEMBERS, PLATFORMS, STAGES } from '@/types';

interface Props {
  activeMember: string;
  onClose: () => void;
}

export default function LogOutreachModal({ activeMember, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    teamMemberName: activeMember,
    leadName: '',
    platform: 'WhatsApp',
    status: 'DMed',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach'] });
      onClose();
    },
  });

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-main)',
  };

  const labelStyle = {
    display: 'block', fontSize: '11px', color: 'var(--text2)',
    textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: '5px',
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-slide-up"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: '14px', padding: '24px', width: '340px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>
          Log Outreach
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Team Member</label>
            <select style={inputStyle} value={form.teamMemberName}
              onChange={e => setForm(f => ({ ...f, teamMemberName: e.target.value }))}>
              {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Lead Name</label>
            <input style={inputStyle} type="text" placeholder="e.g. Rahul Mehta"
              value={form.leadName}
              onChange={e => setForm(f => ({ ...f, leadName: e.target.value }))} />
          </div>

          <div>
            <label style={labelStyle}>Platform</label>
            <select style={inputStyle} value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STAGES.filter(s => s !== 'New Lead').map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, resize: 'none', height: '64px' }}
              placeholder="Any extra context..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px', background: 'transparent', color: 'var(--text2)',
              border: '1px solid var(--border)', borderRadius: '7px',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.leadName || mutation.isPending}
            style={{
              flex: 1, padding: '9px', background: 'var(--accent)', color: '#0d0f12',
              border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
              cursor: form.leadName ? 'pointer' : 'not-allowed',
              opacity: form.leadName ? 1 : 0.5, fontFamily: 'var(--font-main)',
            }}
          >
            {mutation.isPending ? 'Saving…' : 'Save Entry'}
          </button>
        </div>

        {mutation.isError && (
          <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            Failed to save. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
