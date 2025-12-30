import { cn } from '@/lib/utils';

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
    <div className="space-y-5">
      {/* Title Section - Minimal */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{campusName}</p>
      </div>

      {/* Filter Pills - Beli style */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              filter === option.value
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
