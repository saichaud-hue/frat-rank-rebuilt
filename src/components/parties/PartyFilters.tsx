import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-bold text-primary">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline uppercase tracking-wide">Filters</span>
      </div>

      <Select 
        value={filters.fraternity} 
        onValueChange={(value) => onFiltersChange({ ...filters, fraternity: value })}
      >
        <SelectTrigger className="w-[150px] h-10 text-sm font-semibold bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-xl">
          <SelectValue placeholder="Fraternity" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20">
          <SelectItem value="all" className="font-medium">All Fraternities</SelectItem>
          {fraternities.map((frat) => (
            <SelectItem key={frat.id} value={frat.id} className="font-medium">
              {frat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={filters.type} 
        onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
      >
        <SelectTrigger className="w-[130px] h-10 text-sm font-semibold bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-xl">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20">
          <SelectItem value="all" className="font-medium">All Types</SelectItem>
          <SelectItem value="themed" className="font-medium">🎭 Themed</SelectItem>
          <SelectItem value="formal" className="font-medium">🎩 Formal</SelectItem>
          <SelectItem value="mixer" className="font-medium">🎉 Mixer</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.timeframe} 
        onValueChange={(value) => onFiltersChange({ ...filters, timeframe: value })}
      >
        <SelectTrigger className="w-[120px] h-10 text-sm font-semibold bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-xl">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary/20">
          <SelectItem value="all" className="font-medium">All Time</SelectItem>
          <SelectItem value="today" className="font-medium">🔥 Today</SelectItem>
          <SelectItem value="week" className="font-medium">📅 This Week</SelectItem>
          <SelectItem value="month" className="font-medium">📆 This Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
