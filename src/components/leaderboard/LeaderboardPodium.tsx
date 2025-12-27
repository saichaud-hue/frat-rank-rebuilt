import { Crown, Trophy, Medal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import type { Fraternity } from '@/api/base44Client';

interface LeaderboardPodiumProps {
  topThree: Fraternity[];
}

export default function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  if (topThree.length < 3) return null;

  const [first, second, third] = topThree;

  const PodiumCard = ({ 
    frat, 
    rank, 
    size 
  }: { 
    frat: Fraternity; 
    rank: number; 
    size: 'lg' | 'md' 
  }) => {
    const isFirst = rank === 1;
    const Icon = rank === 1 ? Crown : rank === 2 ? Trophy : Medal;
    const colors = {
      1: 'from-amber-400 to-yellow-500',
      2: 'from-slate-300 to-slate-400',
      3: 'from-amber-600 to-amber-700',
    };
    const bgColors = {
      1: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50',
      2: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50',
      3: 'bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200/50',
    };

    return (
      <Link to={createPageUrl(`Fraternity?id=${frat.id}`)}>
        <Card 
          className={`relative overflow-hidden ${bgColors[rank as 1|2|3]} ${
            size === 'lg' ? 'p-4 sm:p-6' : 'p-3 sm:p-4'
          } transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`}
        >
          <div className={`absolute top-2 right-2 p-1.5 rounded-full bg-gradient-to-br ${colors[rank as 1|2|3]}`}>
            <Icon className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
          </div>
          
          <div className="text-center space-y-2">
            <div 
              className={`mx-auto rounded-xl gradient-primary flex items-center justify-center text-white font-bold ${
                size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-lg'
              }`}
            >
              {frat.chapter.charAt(0)}
            </div>
            
            <div>
              <h3 className={`font-bold truncate ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
                {frat.name}
              </h3>
              <Badge variant="outline" className="text-xs mt-1">
                {frat.chapter}
              </Badge>
            </div>

            <div className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
              <span className="gradient-text">
                {Math.min(frat.display_score ?? 5, 10).toFixed(1)}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
      <div className="order-1">
        <PodiumCard frat={second} rank={2} size="md" />
      </div>
      <div className="order-2 transform translate-y-[-8px]">
        <PodiumCard frat={first} rank={1} size="lg" />
      </div>
      <div className="order-3">
        <PodiumCard frat={third} rank={3} size="md" />
      </div>
    </div>
  );
}
