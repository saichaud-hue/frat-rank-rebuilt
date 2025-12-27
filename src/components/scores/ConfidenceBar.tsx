interface ConfidenceBarProps {
  confidence: number;
  repRatings: number;
  partyRatings: number;
}

/**
 * READ-ONLY confidence indicator.
 * Shows how reliable the Overall Score is based on rating data volume.
 * Formula: confOverall = 0.65 * (1 - exp(-nR/25)) + 0.35 * (1 - exp(-nP/40))
 */
export default function ConfidenceBar({ 
  confidence, 
  repRatings, 
  partyRatings 
}: ConfidenceBarProps) {
  const confidencePercent = Math.round(confidence * 100);
  
  const getConfidenceLevel = () => {
    if (confidence >= 0.7) return { label: 'High', color: 'bg-green-500', textColor: 'text-green-500', bgColor: 'bg-green-500/20' };
    if (confidence >= 0.4) return { label: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    return { label: 'Low data', color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-500/20' };
  };

  const { label, color, textColor, bgColor } = getConfidenceLevel();

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Confidence</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{confidencePercent}%</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${bgColor} ${textColor}`}>
            {label}
          </span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 rounded-full ${color}`}
          style={{ width: `${confidencePercent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Based on {repRatings} reputation + {partyRatings} party ratings
      </p>
    </div>
  );
}
