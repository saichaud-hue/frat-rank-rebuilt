import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  momentum: number;
  showLabel?: boolean;
}

export default function TrendIndicator({ momentum, showLabel = false }: TrendIndicatorProps) {
  if (momentum > 0.1) {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <TrendingUp className="h-4 w-4" />
        {showLabel && <span className="text-xs font-medium">Trending Up</span>}
      </div>
    );
  }
  
  if (momentum < -0.1) {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <TrendingDown className="h-4 w-4" />
        {showLabel && <span className="text-xs font-medium">Trending Down</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      {showLabel && <span className="text-xs font-medium">Stable</span>}
    </div>
  );
}
