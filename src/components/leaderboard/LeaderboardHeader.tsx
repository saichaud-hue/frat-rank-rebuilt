import { MapPin, Trophy, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface LeaderboardHeaderProps {
  filter: 'overall' | 'reputation' | 'party' | 'trending';
  onFilterChange: (filter: 'overall' | 'reputation' | 'party' | 'trending') => void;
  campusName?: string;
}

export default function LeaderboardHeader({ 
  filter, 
  onFilterChange, 
  campusName = 'Duke University - Durham, NC' 
}: LeaderboardHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">{campusName}</span>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span>Rankings</span>
        </Badge>
      </div>

      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as any)} className="w-full">
        <TabsList className="flex w-full bg-muted/50 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overall" className="flex-1 shrink-0 min-w-fit text-xs sm:text-sm px-3">
            <span className="sm:hidden">All</span>
            <span className="hidden sm:inline">Overall</span>
          </TabsTrigger>
          <TabsTrigger value="reputation" className="flex-1 shrink-0 min-w-fit text-xs sm:text-sm px-3">
            <span className="sm:hidden">Frats</span>
            <span className="hidden sm:inline">Fraternities</span>
          </TabsTrigger>
          <TabsTrigger value="party" className="flex-1 shrink-0 min-w-fit text-xs sm:text-sm px-3">
            Parties
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex-1 shrink-0 min-w-fit text-xs sm:text-sm px-3">
            <span className="sm:hidden">Hot</span>
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
