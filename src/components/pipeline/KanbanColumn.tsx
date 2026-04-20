'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lead, Stage, STAGE_COLORS } from '@/types';
import LeadCard from './LeadCard';

interface Props {
  stage: Stage;
  leads: Lead[];
  activeMember: string;
  onCardClick: (lead: Lead) => void;
}

export default function KanbanColumn({ stage, leads, activeMember, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div style={{ minWidth: '208px', width: '208px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 2px', marginBottom: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STAGE_COLORS[stage], flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>
          {stage}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          {leads.length}
        </span>
      </div>

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
        <SortableContext id={stage} items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              activeMember={activeMember}
              onClick={() => onCardClick(lead)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
