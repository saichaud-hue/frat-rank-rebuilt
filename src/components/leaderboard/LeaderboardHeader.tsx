import { MapPin } from 'lucide-react';

interface LeaderboardHeaderProps {
  filter: 'overall' | 'reputation' | 'party' | 'trending';
  onFilterChange: (filter: 'overall' | 'reputation' | 'party' | 'trending') => void;
  campusName?: string;
}

const filterOptions = [
  { value: 'overall', label: 'All' },
  { value: 'reputation', label: 'Frats' },
  { value: 'party', label: 'Parties' },
  { value: 'trending', label: 'Hot' },
] as const;

export default function LeaderboardHeader({ 
  filter, 
  onFilterChange, 
  campusName = 'Duke University' 
}: LeaderboardHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground leading-tight">Leaderboard</h1>
        <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="text-sm truncate">{campusName}</span>
        </div>
      </div>

      {/* Filter Pills - Mobile optimized */}
      <div className="flex gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all active:scale-95 tap-target ${
              filter === option.value
                ? 'gradient-primary text-white'
                : 'bg-muted/50 text-muted-foreground active:bg-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
