'use client';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { Lead, Stage, STAGES, PIPELINE_STAGES, STAGE_COLORS } from '@/types';
import KanbanColumn, { AddBucketButton } from './KanbanColumn';
import LeadCard from './LeadCard';
import LeadDetailPanel from './LeadDetailPanel';
import { Zap } from 'lucide-react';

interface Props { activeMember: string; }

// Custom bucket colours cycle
const BUCKET_COLORS = ['#a78bfa','#f472b6','#fb923c','#34d399','#60a5fa','#e879f9','#facc15'];

interface CustomBucket { name: string; color: string; }

const CUSTOM_KEY = 'pulse_custom_buckets';

function loadCustomBuckets(): CustomBucket[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]'); } catch { return []; }
}
function saveCustomBuckets(b: CustomBucket[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(b));
}

export default function PipelineBoard({ activeMember }: Props) {
  const qc = useQueryClient();
  const [vacantSearch, setVacantSearch] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [customBuckets, setCustomBuckets] = useState<CustomBucket[]>([]);
  const [addingBucket, setAddingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  useEffect(() => { setCustomBuckets(loadCustomBuckets()); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetch('/api/leads').then(r => r.json()),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  // ── Helpers ────────────────────────────────────────────────────────
  function isVacant(lead: Lead) {
    const dmedYes    = lead.dmed.trim().toLowerCase() === 'yes';
    const hasOwner   = lead.dmedBy.trim() !== '';
    const progressed = lead.stage !== 'New Lead' && lead.stage !== ('' as Stage);
    return !dmedYes && !hasOwner && !progressed;
  }
  function isOwnedBy(lead: Lead) {
    const m = activeMember.trim().toLowerCase();
    return (
      lead.dmedBy.trim().toLowerCase()     === m ||
      lead.assignedTo.trim().toLowerCase() === m
    );
  }

  // ── Mutations ──────────────────────────────────────────────────────

  // Generic stage/field move (used for drag, outreach click, etc.)
  const moveMutation = useMutation({
    mutationFn: async ({ lead, newStage, extraFields, logPlatform }: {
      lead: Lead; newStage: string;
      extraFields?: Record<string, string>;
      logPlatform?: string;
    }) => {
      await fetch(`/api/leads/${lead.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { stage: newStage, ...extraFields },
          logEntry: {
            teamMemberName: activeMember,
            leadName: lead.fullName,
            platform: logPlatform ?? 'Kanban',
            status: newStage,
            notes: '',
          },
        }),
      });
    },
    onMutate: async ({ lead, newStage, extraFields }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const snapshot = qc.getQueryData<Lead[]>(['leads']);
      qc.setQueryData<Lead[]>(['leads'], (old = []) =>
        old.map(l => l.id === lead.id
          ? { ...l, stage: newStage as Stage, ...extraFields }
          : l
        )
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(['leads'], ctx.snapshot);
    },
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['outreach'] });
      }, 2000);
    },
  });

  // Claim: sets dmedBy + assignedTo + stage=Claimed (NOT DMed yet)
  const claimMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      await fetch(`/api/leads/${lead.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            stage: 'Claimed',
            dmedBy: activeMember,
            assignedTo: activeMember,
          },
          // No logEntry for claim — only log when actual outreach happens
        }),
      });
    },
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const snapshot = qc.getQueryData<Lead[]>(['leads']);
      qc.setQueryData<Lead[]>(['leads'], (old = []) =>
        old.map(l => l.id === lead.id
          ? { ...l, stage: 'Claimed' as Stage, dmedBy: activeMember, assignedTo: activeMember }
          : l
        )
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(['leads'], ctx.snapshot);
    },
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['leads'] }), 2000);
    },
  });

  // Called when user clicks WA/IG/Email on a Claimed card
  function handleOutreach(lead: Lead, platform: 'wa' | 'ig' | 'email') {
    const platformLabel = platform === 'wa' ? 'WhatsApp' : platform === 'ig' ? 'Instagram DM' : 'Email';
    moveMutation.mutate({
      lead,
      newStage: 'DMed',
      extraFields: {
        dmed: 'Yes',
        dateOfDm: new Date().toISOString().split('T')[0],
        dmedBy: activeMember,
      },
      logPlatform: platformLabel,
    });
  }

  // ── Drag and drop ──────────────────────────────────────────────────
  const activeLead = leads.find(l => l.id === activeId);

  const allStageIds = [
    ...PIPELINE_STAGES,
    ...customBuckets.map(b => b.name),
  ];

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const lead = leads.find(l => l.id === active.id);
    if (!lead) return;

    let newStage: string | undefined;
    if (allStageIds.includes(over.id as string)) {
      newStage = over.id as string;
    } else {
      const overLead = leads.find(l => l.id === over.id);
      if (overLead) newStage = overLead.stage;
    }

    if (newStage && newStage !== lead.stage) {
      const extraFields: Record<string, string> = {};
      // If dragging into DMed manually, also stamp the DM fields
      if (newStage === 'DMed' && !lead.dmed) {
        extraFields.dmed = 'Yes';
        extraFields.dateOfDm = new Date().toISOString().split('T')[0];
      }
      moveMutation.mutate({ lead, newStage, extraFields });
    }
  }, [leads, allStageIds, moveMutation]);

  // ── Custom buckets ─────────────────────────────────────────────────
  function addBucket() {
    const name = newBucketName.trim();
    if (!name) return;
    const color = BUCKET_COLORS[customBuckets.length % BUCKET_COLORS.length];
    const updated = [...customBuckets, { name, color }];
    setCustomBuckets(updated);
    saveCustomBuckets(updated);
    setNewBucketName('');
    setAddingBucket(false);
  }

  function deleteBucket(name: string) {
    const updated = customBuckets.filter(b => b.name !== name);
    setCustomBuckets(updated);
    saveCustomBuckets(updated);
  }

  // ── Search / filter ────────────────────────────────────────────────
  function filterLeads(arr: Lead[], q: string) {
    if (!q.trim()) return arr;
    const query = q.toLowerCase();
    return arr.filter(l =>
      l.fullName.toLowerCase().includes(query) ||
      l.email.toLowerCase().includes(query) ||
      l.phoneNumber.includes(query) ||
      l.notes.toLowerCase().includes(query)
    );
  }

  const vacantLeads = filterLeads(leads.filter(isVacant), vacantSearch);
  const myLeads     = filterLeads(leads.filter(isOwnedBy), pipelineSearch);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text3)' }}>
          Acting as <strong style={{ color: 'var(--text)' }}>{activeMember}</strong>
        </div>
      </div>

      {isLoading ? <LoadingSkeleton /> : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT: Vacant leads pool ── */}
          <div style={{
            width: '240px', minWidth: '240px', flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)' }}>
                  Vacant
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  {leads.filter(isVacant).length}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '12px', pointerEvents: 'none' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search vacant…"
                  value={vacantSearch}
                  onChange={e => setVacantSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '5px 8px 5px 24px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                    fontFamily: 'var(--font-main)',
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
              {vacantLeads.length === 0 ? (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>
                  No unclaimed leads
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {vacantLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      activeMember={activeMember}
                      isVacant
                      onClick={() => setSelectedLead(lead)}
                      onClaim={() => claimMutation.mutate(lead)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: My Pipeline kanban ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Pipeline search bar */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search my pipeline…"
                  value={pipelineSearch}
                  onChange={e => setPipelineSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 12px 7px 30px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: '7px', color: 'var(--text)', fontSize: '13px',
                    fontFamily: 'var(--font-main)',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                <strong style={{ color: 'var(--accent)' }}>{leads.filter(isOwnedBy).length}</strong> leads
                {pipelineSearch && <span style={{ color: 'var(--text3)' }}> · {myLeads.length} match</span>}
              </span>
            </div>

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
              {PIPELINE_STAGES.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={myLeads.filter(l => l.stage === stage)}
                  activeMember={activeMember}
                  onCardClick={setSelectedLead}
                  onOutreach={handleOutreach}
                />
              ))}

              {/* Custom buckets */}
              {customBuckets.map(bucket => (
                <KanbanColumn
                  key={bucket.name}
                  stage={bucket.name}
                  color={bucket.color}
                  leads={myLeads.filter(l => l.stage === (bucket.name as Stage))}
                  activeMember={activeMember}
                  onCardClick={setSelectedLead}
                  onOutreach={handleOutreach}
                  isCustom
                  onDeleteBucket={deleteBucket}
                />
              ))}

              {/* Add bucket */}
              {addingBucket ? (
                <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '2px', flexShrink: 0 }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Bucket name…"
                    value={newBucketName}
                    onChange={e => setNewBucketName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addBucket();
                      if (e.key === 'Escape') { setAddingBucket(false); setNewBucketName(''); }
                    }}
                    style={{
                      padding: '7px 10px', borderRadius: '7px',
                      border: '1px solid var(--accent)', background: 'var(--surface2)',
                      color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-main)',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={addBucket}
                      style={{
                        flex: 1, padding: '6px', borderRadius: '6px',
                        background: 'var(--accent)', color: '#0d0f12',
                        border: 'none', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-main)',
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingBucket(false); setNewBucketName(''); }}
                      style={{
                        padding: '6px 10px', borderRadius: '6px',
                        background: 'none', color: 'var(--text2)',
                        border: '1px solid var(--border)', fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'var(--font-main)',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <AddBucketButton onClick={() => setAddingBucket(true)} />
              )}
            </div>

            <DragOverlay>
              {activeLead ? (
                <div style={{ transform: 'rotate(2deg)', opacity: 0.9 }}>
                  <LeadCard lead={activeLead} activeMember={activeMember} onClick={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </div>
        </div>
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
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: '240px', borderRight: '1px solid var(--border)', padding: '12px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '90px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)', opacity: 1 - i * 0.15 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', flex: 1 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ minWidth: '208px', width: '208px' }}>
            <div style={{ height: '28px', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '12px' }} />
            {[1,2].map(j => (
              <div key={j} style={{ height: '90px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)', opacity: 1 - j * 0.2 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}