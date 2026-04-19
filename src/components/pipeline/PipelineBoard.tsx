'use client';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, pointerWithin,
  rectIntersection, type CollisionDetection,
} from '@dnd-kit/core';
import { Lead, Stage, STAGES, STAGE_COLORS } from '@/types';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';
import LeadDetailPanel from './LeadDetailPanel';
import { Zap, Users } from 'lucide-react';

interface Props {
  activeMember: string;
}

type View = 'vacant' | 'mine';

/**
 * A lead is vacant if nobody has claimed it yet.
 * We check both "DMed by?" (empty) AND "DMed?" (not "yes") AND stage is New Lead / blank.
 * ANY one of those being filled = claimed.
 */
function isVacant(lead: Lead): boolean {
  const dmedYes  = lead.dmed.trim().toLowerCase() === 'yes';
  const hasOwner = lead.dmedBy.trim() !== '';
  const progressed = lead.stage !== 'New Lead' && lead.stage !== ('' as Stage);
  return !dmedYes && !hasOwner && !progressed;
}

/**
 * A lead appears in a member's pipeline if they DMed it OR it's assigned to them.
 * Case-insensitive comparison to handle any sheet inconsistencies.
 */
function isOwnedBy(lead: Lead, member: string): boolean {
  const m = member.trim().toLowerCase();
  return (
    lead.dmedBy.trim().toLowerCase()     === m ||
    lead.assignedTo.trim().toLowerCase() === m
  );
}

export default function PipelineBoard({ activeMember }: Props) {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView]               = useState<View>('vacant');
  const [claimOverrides, setClaimOverrides] = useState<Record<string, Partial<Lead>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;

    const rectHits = rectIntersection(args);
    if (rectHits.length > 0) return rectHits;

    return closestCorners(args);
  }, []);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetch('/api/leads').then(r => r.json()),
    refetchInterval: 30_000,
    // Keep previous data while fetching so the board never flickers blank
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setClaimOverrides(prev => {
      let changed = false;
      const next = { ...prev };

      for (const [leadId, override] of Object.entries(prev)) {
        const lead = leads.find(item => item.id === leadId);

        if (!lead) {
          delete next[leadId];
          changed = true;
          continue;
        }

        const claimSynced =
          lead.dmed === override.dmed &&
          lead.dmedBy === override.dmedBy &&
          lead.assignedTo === override.assignedTo &&
          lead.stage === override.stage;

        if (claimSynced) {
          delete next[leadId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [leads]);

  const boardLeads = leads.map(lead => ({
    ...lead,
    ...(claimOverrides[lead.id] ?? {}),
  }));

  // ── Claim ─────────────────────────────────────────────────────────
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

    // 1. Immediately update local cache — move card to mine
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const snapshot = qc.getQueryData<Lead[]>(['leads']);
      const claimOverride: Partial<Lead> = {
        dmed: 'Yes',
        dmedBy: activeMember,
        assignedTo: activeMember,
        stage: 'DMed',
      };

      setClaimOverrides(prev => ({
        ...prev,
        [lead.id]: claimOverride,
      }));

      qc.setQueryData<Lead[]>(['leads'], (old = []) =>
        old.map(l =>
          l.id === lead.id
            ? { ...l, ...claimOverride }
            : l
        )
      );

      return { snapshot };
    },

    // 2. On error, roll back
    onError: (_err, lead, ctx) => {
      setClaimOverrides(prev => {
        const next = { ...prev };
        delete next[lead.id];
        return next;
      });
      if (ctx?.snapshot) qc.setQueryData(['leads'], ctx.snapshot);
    },

    // 3. On success: switch view, then refetch after a 2s delay
    //    (give Google Sheets time to persist the write before we re-read)
    onSuccess: () => {
      setView('mine');
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['outreach'] });
      }, 2000);
    },
  });

  // ── Stage move ────────────────────────────────────────────────────
  const moveMutation = useMutation({
    mutationFn: async ({ lead, newStage }: { lead: Lead; newStage: Stage }) => {
      const res = await fetch(`/api/leads/${lead.rowIndex}`, {
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
      if (!res.ok) throw new Error('Move failed');
    },

    onMutate: async ({ lead, newStage }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const snapshot = qc.getQueryData<Lead[]>(['leads']);
      const previousOverride = claimOverrides[lead.id];

      setClaimOverrides(prev => {
        return {
          ...prev,
          [lead.id]: {
            ...(prev[lead.id] ?? {}),
            stage: newStage,
          },
        };
      });

      qc.setQueryData<Lead[]>(['leads'], (old = []) =>
        old.map(l => l.id === lead.id ? { ...l, stage: newStage } : l)
      );
      return { snapshot, previousOverride, leadId: lead.id };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.leadId) {
        setClaimOverrides(prev => {
          const next = { ...prev };

          if (ctx.previousOverride) {
            next[ctx.leadId] = ctx.previousOverride;
          } else {
            delete next[ctx.leadId];
          }

          return next;
        });
      }

      if (ctx?.snapshot) qc.setQueryData(['leads'], ctx.snapshot);
    },

    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['outreach'] });
      }, 2000);
    },
  });

  // ── DnD ───────────────────────────────────────────────────────────
  const activeLead = boardLeads.find(l => l.id === activeId);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const lead = boardLeads.find(l => l.id === active.id);
    if (!lead) return;

    let newStage: Stage | undefined;
    if (STAGES.includes(over.id as Stage)) {
      newStage = over.id as Stage;
    } else {
      const overLead = boardLeads.find(l => l.id === over.id);
      if (overLead) newStage = overLead.stage;
    }

    if (newStage && newStage !== lead.stage) {
      moveMutation.mutate({ lead, newStage });
    }
  }, [boardLeads, moveMutation]);

  // ── Filtering ─────────────────────────────────────────────────────
  const vacantLeads = boardLeads.filter(isVacant);
  const myLeads     = boardLeads.filter(l => isOwnedBy(l, activeMember));

  const applySearch = (arr: Lead[]) => {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(l =>
      l.fullName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phoneNumber.includes(q)
    );
  };

  const filteredVacant = applySearch(vacantLeads);
  const filteredMine   = applySearch(myLeads);

  // ── UI helpers ────────────────────────────────────────────────────
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

      {/* ── Toolbar ── */}
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
            <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '11px', background: 'rgba(99,102,241,.2)', color: '#818cf8' }}>
              {vacantLeads.length}
            </span>
          </button>
          <button style={tabStyle(view === 'mine')} onClick={() => setView('mine')}>
            <Users size={13} />
            My Pipeline
            <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '11px', background: 'rgba(79,196,207,.15)', color: 'var(--accent)' }}>
              {myLeads.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
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

      {/* ── Views ── */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : view === 'vacant' ? (
        <VacantPool
          leads={filteredVacant}
          activeMember={activeMember}
          onClaim={lead => claimMutation.mutate(lead)}
          claimingIds={claimMutation.isPending ? [] : []}
          onCardClick={setSelectedLead}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', flex: 1, padding: '16px 20px', alignItems: 'flex-start' }}>
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

// ── Vacant pool grid ─────────────────────────────────────────────────
function VacantPool({ leads, activeMember, onClaim, onCardClick }: {
  leads: Lead[];
  activeMember: string;
  onClaim: (lead: Lead) => void;
  claimingIds: string[];
  onCardClick: (lead: Lead) => void;
}) {
  if (leads.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '60px 20px', color: 'var(--text3)' }}>
        <Zap size={32} style={{ marginBottom: '12px', opacity: .4 }} />
        <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: 'var(--text2)' }}>No vacant leads</p>
        <p style={{ fontSize: '13px' }}>All leads have been claimed. Check back soon.</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
        {leads.length} unclaimed lead{leads.length !== 1 ? 's' : ''} — click{' '}
        <strong style={{ color: '#818cf8' }}>Claim &amp; DM</strong> to take ownership.
        It will move to your pipeline and disappear for everyone else.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            activeMember={activeMember}
            isVacant
            onClick={() => onCardClick(lead)}
            onClaim={onClaim}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', flex: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ minWidth: '208px', width: '208px' }}>
          <div style={{ height: '28px', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '12px' }} />
          {[1, 2, 3].map(j => (
            <div key={j} style={{ height: '100px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)', opacity: 1 - j * 0.2 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
