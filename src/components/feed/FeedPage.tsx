import { ScrollArea } from '@/components/ui/scroll-area';
import VotingModule from './VotingModule';
import PlanningWindow from './PlanningWindow';
import MomentumSnapshot from './MomentumSnapshot';

export default function FeedPage() {
  return (
    <div className="flex flex-col h-full -mx-4 -mt-4">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-24">
          {/* 1. Voting Module - compact, first */}
          <VotingModule />

          {/* 2. Planning Window - primary focus, largest section */}
          <PlanningWindow />

          {/* 3. Momentum Snapshot - supporting section */}
          <MomentumSnapshot />
        </div>
      </ScrollArea>
    </div>
  );
}
