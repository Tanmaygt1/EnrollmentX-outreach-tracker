'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { Lead, Stage, STAGES, isVacant, isOwnedBy, STAGE_COLORS } from '@/types';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';
import LeadDetailPanel from './LeadDetailPanel';
import { MessageCircle, Instagram, Zap, Users } from 'lucide-react';

interface Props {
  activeMember: string;
}

type View = 'vacant' | 'mine';

async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch('/api/leads');
  const data: unknown = await res.json();

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Failed to fetch leads';
    throw new Error(message);
  }

  if (Array.isArray(data)) {
    return data as Lead[];
  }

  if (typeof data === 'object' && data !== null && 'leads' in data && Array.isArray(data.leads)) {
    return data.leads as Lead[];
  }

  throw new Error('Invalid leads response received from /api/leads');
}

export default function PipelineBoard({ activeMember }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView] = useState<View>('vacant');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: leads = [], isLoading, isError, error } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: fetchLeads,
    refetchInterval: 20_000, // poll every 20s so team sees each other's claims
  });

  // ── Claim a lead (mark as DMed by activeMember) ──────────────────
  const claimMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const res = await fetch(`/api/leads/${lead.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          teamMember: activeMember,
          leadName: lead.fullName,
          platform: 'WhatsApp',
        }),
      });
      if (!res.ok) throw new Error('Claim failed');
    },
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData<Lead[]>(['leads']);
      // Optimistically mark as claimed
      qc.setQueryData<Lead[]>(['leads'], old =>
        (old ?? []).map(l => l.id === lead.id
          ? { ...l, dmed: 'Yes', dmedBy: activeMember, stage: 'DMed', assignedTo: activeMember }
          : l
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev);
    },
    onSettled: (_, __, lead) => {
      setClaimingId(null);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['outreach'] });
      // Auto-switch to My Pipeline after claiming
      setView('mine');
    },
  });

  // ── Stage drag-and-drop (only for "My Pipeline" view) ────────────
  const moveMutation = useMutation({
    mutationFn: async ({ lead, newStage }: { lead: Lead; newStage: Stage }) => {
      await fetch(`/api/leads/${lead.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { stage: newStage },
          logEntry: {
            teamMemberName: activeMember,
            leadName: lead.fullName,
            platform: 'Kanban',
            status: newStage,
            notes: '',
          },
        }),
      });
    },
    onMutate: async ({ lead, newStage }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData<Lead[]>(['leads']);
      qc.setQueryData<Lead[]>(['leads'], old =>
        (old ?? []).map(l => l.id === lead.id ? { ...l, stage: newStage } : l)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['outreach'] });
    },
  });

  const activeLead = leads.find(l => l.id === activeId);

  // Split leads
  const vacantLeads = leads.filter(l => isVacant(l));
  const myLeads     = leads.filter(l => isOwnedBy(l, activeMember));

  // Apply search
  const applySearch = (arr: Lead[]) =>
    !search ? arr : arr.filter(l =>
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.phoneNumber.includes(search)
    );

  const filteredVacant = applySearch(vacantLeads);
  const filteredMine   = applySearch(myLeads);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const lead = leads.find(l => l.id === active.id);
    if (!lead) return;

    let newStage: Stage | undefined;
    if (STAGES.includes(over.id as Stage)) {
      newStage = over.id as Stage;
    } else {
      const overLead = leads.find(l => l.id === over.id);
      if (overLead) newStage = overLead.stage;
    }

    if (newStage && newStage !== lead.stage) {
      moveMutation.mutate({ lead, newStage });
    }
  }, [leads, moveMutation]);

  const handleClaim = async (lead: Lead) => {
    setClaimingId(lead.id);
    claimMutation.mutate(lead);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-main)',
    background: active ? 'var(--surface3)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text2)',
    transition: 'all .15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface2)', borderRadius: '10px', padding: '3px' }}>
          <button style={tabStyle(view === 'vacant')} onClick={() => setView('vacant')}>
            <Zap size={13} />
            Vacant Leads
            <span style={{
              padding: '1px 7px', borderRadius: '10px', fontSize: '11px',
              background: 'rgba(99,102,241,.2)', color: '#818cf8',
            }}>
              {vacantLeads.length}
            </span>
          </button>
          <button style={tabStyle(view === 'mine')} onClick={() => setView('mine')}>
            <Users size={13} />
            My Pipeline
            <span style={{
              padding: '1px 7px', borderRadius: '10px', fontSize: '11px',
              background: 'rgba(79,196,207,.15)', color: 'var(--accent)',
            }}>
              {myLeads.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1', maxWidth: '260px' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)', fontSize: '13px', pointerEvents: 'none',
          }}>⌕</span>
          <input
            type="text"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '7px 12px 7px 30px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '7px', color: 'var(--text)', fontSize: '13px',
              fontFamily: 'var(--font-main)',
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text3)' }}>
          Acting as <strong style={{ color: 'var(--text)' }}>{activeMember}</strong>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} />
      ) : view === 'vacant' ? (
        /* ── VACANT LEADS POOL ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {filteredVacant.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flex: 1, padding: '60px 20px', color: 'var(--text3)',
            }}>
              <Zap size={32} style={{ marginBottom: '12px', opacity: .4 }} />
              <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: 'var(--text2)' }}>
                No vacant leads
              </p>
              <p style={{ fontSize: '13px' }}>
                All leads have been claimed. Check back soon.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
                {filteredVacant.length} unclaimed leads — click <strong style={{ color: '#818cf8' }}>Claim &amp; DM</strong> to take ownership. That lead will move to your pipeline and disappear from this list for everyone else.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px',
              }}>
                {filteredVacant.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    activeMember={activeMember}
                    isVacant
                    onClick={() => setSelectedLead(lead)}
                    onClaim={handleClaim}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── MY PIPELINE KANBAN ── */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{
            display: 'flex', gap: '12px', overflowX: 'auto',
            flex: 1, padding: '16px 20px', alignItems: 'flex-start',
          }}>
            {STAGES.filter(s => s !== 'New Lead').map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                activeMember={activeMember}
                leads={filteredMine.filter(l => l.stage === stage)}
                onCardClick={setSelectedLead}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div style={{ transform: 'rotate(2deg)', opacity: 0.9 }}>
                <LeadCard lead={activeLead} activeMember={activeMember} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          activeMember={activeMember}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', flex: 1 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ minWidth: '208px', width: '208px' }}>
          <div style={{ height: '28px', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '12px' }} />
          {[1,2,3].map(j => (
            <div key={j} style={{
              height: '100px', background: 'var(--surface)', borderRadius: '10px',
              marginBottom: '8px', border: '1px solid var(--border)', opacity: 1 - j * 0.2,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '40px 20px',
      color: 'var(--text2)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
        Couldn&apos;t load leads
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '420px' }}>
        {message}
      </p>
    </div>
  );
}
