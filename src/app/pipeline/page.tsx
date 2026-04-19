'use client';
import { useActiveMember } from '@/components/ui/Nav';
import PipelineBoard from '@/components/pipeline/PipelineBoard';

export default function PipelinePage() {
  const { activeMember } = useActiveMember();
  return <PipelineBoard activeMember={activeMember} />;
}
