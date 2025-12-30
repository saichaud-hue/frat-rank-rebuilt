import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Star, PartyPopper, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl } from '@/utils';
import Podium from './Podium';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

interface PodiumCardProps {
  category: CategoryType;
  topThree: FraternityWithScores[];
}

const categoryConfig: Record<CategoryType, { title: string; subtitle: string; icon: LucideIcon }> = {
  overall: {
    title: 'Overall',
    subtitle: 'Top performers',
    icon: Crown,
  },
  reputation: {
    title: 'Fraternities',
    subtitle: 'Best reputation',
    icon: Star,
  },
  party: {
    title: 'Parties',
    subtitle: 'Best party hosts',
    icon: PartyPopper,
  },
  trending: {
    title: 'Trending',
    subtitle: 'Most active now',
    icon: TrendingUp,
  },
};

export default function PodiumCard({ category, topThree }: PodiumCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Link to={createPageUrl(`Rankings?category=${category}`)}>
      <Card 
        className="relative overflow-hidden p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-slate-700/50 border active:scale-[0.98] transition-all duration-200 hover:shadow-xl group"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{config.title}</h3>
              <p className="text-xs text-slate-400">{config.subtitle}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Podium */}
        <Podium topThree={topThree} variant="summary" showLinks={false} />

        {/* Decorative glow */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-500 to-yellow-500 opacity-10 rounded-full blur-2xl" />
        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 opacity-20 rounded-full blur-xl" />
      </Card>
    </Link>
  );
}
