import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal } from 'lucide-react';
import type { Fraternity } from '@/api/base44Client';

interface PartyFilters {
  fraternity: string;
  type: string;
  timeframe: string;
}

interface PartyFiltersProps {
  filters: PartyFilters;
  onFiltersChange: (filters: PartyFilters) => void;
  fraternities: Fraternity[];
}

export default function PartyFilters({ filters, onFiltersChange, fraternities }: PartyFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary shrink-0">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
      </div>

      <Select 
        value={filters.fraternity} 
        onValueChange={(value) => onFiltersChange({ ...filters, fraternity: value })}
      >
        <SelectTrigger className="h-8 text-xs bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-lg px-2 min-w-0 w-auto shrink-0">
          <SelectValue placeholder="Frat" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20 bg-popover">
          <SelectItem value="all">All Frats</SelectItem>
          {fraternities.map((frat) => (
            <SelectItem key={frat.id} value={frat.id}>
              {frat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={filters.type} 
        onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
      >
        <SelectTrigger className="h-8 text-xs bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-lg px-2 min-w-0 w-auto shrink-0">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20 bg-popover">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="themed">🎭 Themed</SelectItem>
          <SelectItem value="formal">🎩 Formal</SelectItem>
          <SelectItem value="mixer">🎉 Mixer</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.timeframe} 
        onValueChange={(value) => onFiltersChange({ ...filters, timeframe: value })}
      >
        <SelectTrigger className="h-8 text-xs bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-lg px-2 min-w-0 w-auto shrink-0">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20 bg-popover">
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">🔥 Today</SelectItem>
          <SelectItem value="week">📅 Week</SelectItem>
          <SelectItem value="month">📆 Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
