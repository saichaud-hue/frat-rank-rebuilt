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
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="overall" className="text-xs sm:text-sm">
            Overall
          </TabsTrigger>
          <TabsTrigger value="reputation" className="text-xs sm:text-sm">
            Fraternities
          </TabsTrigger>
          <TabsTrigger value="party" className="text-xs sm:text-sm">
            Parties
          </TabsTrigger>
          <TabsTrigger value="trending" className="text-xs sm:text-sm">
            Trending
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
