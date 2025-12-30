import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Star, PartyPopper, TrendingUp, Trophy, Medal, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl } from '@/utils';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

interface PodiumCardProps {
  category: CategoryType;
  topThree: FraternityWithScores[];
}

const categoryConfig: Record<CategoryType, { title: string; subtitle: string; icon: LucideIcon; accentColor: string }> = {
  overall: {
    title: 'Overall',
    subtitle: 'Top Houses',
    icon: Crown,
    accentColor: 'from-amber-500 to-yellow-500',
  },
  reputation: {
    title: 'Fraternities',
    subtitle: 'Best Reputation',
    icon: Star,
    accentColor: 'from-violet-500 to-purple-500',
  },
  party: {
    title: 'Parties',
    subtitle: 'Best Party Hosts',
    icon: PartyPopper,
    accentColor: 'from-rose-500 to-pink-500',
  },
  trending: {
    title: 'Trending',
    subtitle: 'Rising Fast',
    icon: TrendingUp,
    accentColor: 'from-emerald-500 to-teal-500',
  },
};

// Podium block colors
const PODIUM_COLORS = {
  gold: {
    bg: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600',
    ring: 'ring-amber-400',
    badge: 'bg-gradient-to-br from-amber-400 to-yellow-500',
  },
  silver: {
    bg: 'bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500',
    ring: 'ring-slate-300',
    badge: 'bg-gradient-to-br from-slate-300 to-slate-400',
  },
  bronze: {
    bg: 'bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800',
    ring: 'ring-amber-600',
    badge: 'bg-gradient-to-br from-amber-600 to-amber-700',
  },
};

export default function PodiumCard({ category, topThree }: PodiumCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  if (topThree.length < 3) return null;

  // Order: 2nd, 1st, 3rd for podium layout
  const second = topThree[1];
  const first = topThree[0];
  const third = topThree[2];

  return (
    <Link to={createPageUrl(`Rankings?category=${category}`)}>
      <Card 
        className="relative overflow-hidden p-3 bg-white/80 backdrop-blur-sm border-white/50 shadow-lg shadow-slate-200/50 active:scale-[0.97] transition-all duration-200 hover:shadow-xl group h-[180px]"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-white to-rose-50/30 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.accentColor} flex items-center justify-center shadow-md flex-shrink-0`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[14px] text-slate-800 truncate">{config.title}</h3>
              <p className="text-[11px] text-slate-500 truncate">{config.subtitle}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </div>

        {/* Podium Visualization - Fixed height container */}
        <div className="relative h-[120px] flex items-end justify-center">
          {/* 3-column grid for podium */}
          <div className="grid grid-cols-3 gap-1.5 w-full max-w-[180px]">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className={`${PODIUM_COLORS.silver.badge} w-3.5 h-3.5 rounded-full flex items-center justify-center mb-0.5`}>
                <Trophy className="h-2 w-2 text-white" />
              </div>
              <Avatar className={`h-9 w-9 ring-2 ${PODIUM_COLORS.silver.ring} bg-white flex-shrink-0`}>
                <AvatarImage src={second.logo_url} />
                <AvatarFallback className="bg-white text-slate-700 font-bold text-[11px]">
                  {second.chapter?.substring(0, 2) || second.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`w-full h-11 ${PODIUM_COLORS.silver.bg} rounded-t-xl mt-1.5 flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className={`${PODIUM_COLORS.gold.badge} w-4 h-4 rounded-full flex items-center justify-center mb-0.5`}>
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
              <Avatar className={`h-9 w-9 ring-2 ${PODIUM_COLORS.gold.ring} bg-white flex-shrink-0`}>
                <AvatarImage src={first.logo_url} />
                <AvatarFallback className="bg-white text-amber-600 font-bold text-[11px]">
                  {first.chapter?.substring(0, 2) || first.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`w-full h-14 ${PODIUM_COLORS.gold.bg} rounded-t-xl mt-1.5 flex items-center justify-center`}>
                <span className="text-white font-bold text-base">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className={`${PODIUM_COLORS.bronze.badge} w-3.5 h-3.5 rounded-full flex items-center justify-center mb-0.5`}>
                <Medal className="h-2 w-2 text-white" />
              </div>
              <Avatar className={`h-9 w-9 ring-2 ${PODIUM_COLORS.bronze.ring} bg-white flex-shrink-0`}>
                <AvatarImage src={third.logo_url} />
                <AvatarFallback className="bg-white text-amber-700 font-bold text-[11px]">
                  {third.chapter?.substring(0, 2) || third.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`w-full h-10 ${PODIUM_COLORS.bronze.bg} rounded-t-xl mt-1.5 flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-amber-200/30 to-yellow-200/20 rounded-full blur-2xl pointer-events-none" />
      </Card>
    </Link>
  );
}
