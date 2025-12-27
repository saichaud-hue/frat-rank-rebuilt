import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { Fraternity } from '@/api/base44Client';

interface PartyFilters {
  fraternity: string;
  theme: string;
  timeframe: string;
}

interface PartyFiltersProps {
  filters: PartyFilters;
  onFiltersChange: (filters: PartyFilters) => void;
  fraternities: Fraternity[];
}

export default function PartyFilters({ filters, onFiltersChange, fraternities }: PartyFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filters:</span>
      </div>

      <Select 
        value={filters.fraternity} 
        onValueChange={(value) => onFiltersChange({ ...filters, fraternity: value })}
      >
        <SelectTrigger className="w-[140px] h-9 text-sm glass">
          <SelectValue placeholder="Fraternity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Fraternities</SelectItem>
          {fraternities.map((frat) => (
            <SelectItem key={frat.id} value={frat.id}>
              {frat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={filters.theme} 
        onValueChange={(value) => onFiltersChange({ ...filters, theme: value })}
      >
        <SelectTrigger className="w-[120px] h-9 text-sm glass">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Themes</SelectItem>
          <SelectItem value="formal">Formal</SelectItem>
          <SelectItem value="casual">Casual</SelectItem>
          <SelectItem value="themed">Themed</SelectItem>
          <SelectItem value="mixer">Mixer</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.timeframe} 
        onValueChange={(value) => onFiltersChange({ ...filters, timeframe: value })}
      >
        <SelectTrigger className="w-[110px] h-9 text-sm glass">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
