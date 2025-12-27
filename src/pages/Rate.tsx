import { Star } from 'lucide-react';
import RatingHistory from '@/components/rate/RatingHistory';

export default function Rate() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Star className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Rate</h1>
      </div>

      {/* Rating History */}
      <RatingHistory />
    </div>
  );
}
