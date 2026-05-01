'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lead, Stage, STAGE_COLORS } from '@/types';
import LeadCard from './LeadCard';
import { Trash2 } from 'lucide-react';

interface Props {
  stage: Stage | string;           // string for custom buckets
  color?: string;                  // custom bucket colour
  leads: Lead[];
  activeMember: string;
  onCardClick: (lead: Lead) => void;
  onOutreach?: (lead: Lead, platform: 'wa' | 'ig' | 'email') => void;
  onDeleteBucket?: (stage: string) => void;  // only for custom buckets
  isCustom?: boolean;
}

export default function KanbanColumn({
  stage, color, leads, activeMember, onCardClick, onOutreach, onDeleteBucket, isCustom,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const stageColor = color ?? (STAGE_COLORS[stage as Stage] || '#4fc4cf');

  return (
    <div style={{ minWidth: '208px', width: '208px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 2px', marginBottom: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: stageColor, flexShrink: 0 }} />
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '.06em',
          textTransform: 'uppercase', color: 'var(--text2)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {stage}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          {leads.length}
        </span>
        {isCustom && onDeleteBucket && (
          <button
            onClick={() => onDeleteBucket(stage as string)}
            title="Remove bucket"
            style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center',
              borderRadius: '4px', marginLeft: '2px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: '7px',
          minHeight: '80px', padding: '6px', borderRadius: '10px',
          border: isOver ? '1px dashed rgba(79,196,207,.4)' : '1px solid transparent',
          background: isOver ? 'rgba(79,196,207,.04)' : 'transparent',
          transition: 'all .15s',
        }}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              activeMember={activeMember}
              isClaimed={stage === 'Claimed'}
              onClick={() => onCardClick(lead)}
              onOutreach={onOutreach}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/** The "+ Add bucket" button rendered after all columns */
export function AddBucketButton({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ minWidth: '180px', display: 'flex', alignItems: 'flex-start', paddingTop: '2px', flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '8px 14px', borderRadius: '8px',
          border: '1px dashed var(--border2)', background: 'none',
          color: 'var(--text3)', fontSize: '12px', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-main)',
          transition: 'all .15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)';
        }}
      >
        + Add bucket
      </button>
    </div>
  );
}