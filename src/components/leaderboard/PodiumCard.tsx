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
        className="relative overflow-hidden p-4 pb-3 bg-white/80 backdrop-blur-sm border-white/50 shadow-lg shadow-slate-200/50 active:scale-[0.97] transition-all duration-200 hover:shadow-xl group"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-white to-rose-50/30 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.accentColor} flex items-center justify-center shadow-md`}>
              <Icon className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">{config.title}</h3>
              <p className="text-[11px] text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Podium Visualization */}
        <div className="relative flex items-end justify-center gap-2 h-28">
          {/* 2nd Place */}
          <div className="flex flex-col items-center w-[72px]">
            <div className={`${PODIUM_COLORS.silver.badge} w-5 h-5 rounded-full flex items-center justify-center mb-1 shadow-sm`}>
              <Trophy className="h-2.5 w-2.5 text-white" />
            </div>
            <Avatar className={`h-10 w-10 ring-2 ${PODIUM_COLORS.silver.ring} shadow-md bg-white`}>
              <AvatarImage src={second.logo_url} />
              <AvatarFallback className="bg-white text-slate-700 font-bold text-xs">
                {second.chapter?.substring(0, 2) || second.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`w-full h-12 ${PODIUM_COLORS.silver.bg} rounded-t-lg mt-1.5 flex items-center justify-center shadow-inner`}>
              <span className="text-white font-bold text-lg">2</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center w-[80px] -mt-2">
            <div className={`${PODIUM_COLORS.gold.badge} w-6 h-6 rounded-full flex items-center justify-center mb-1 shadow-md animate-pulse`}>
              <Crown className="h-3.5 w-3.5 text-white" />
            </div>
            <Avatar className={`h-12 w-12 ring-2 ${PODIUM_COLORS.gold.ring} shadow-lg bg-white`}>
              <AvatarImage src={first.logo_url} />
              <AvatarFallback className="bg-white text-amber-600 font-bold text-sm">
                {first.chapter?.substring(0, 2) || first.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`w-full h-16 ${PODIUM_COLORS.gold.bg} rounded-t-lg mt-1.5 flex items-center justify-center shadow-inner`}>
              <span className="text-white font-bold text-xl">1</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center w-[72px]">
            <div className={`${PODIUM_COLORS.bronze.badge} w-5 h-5 rounded-full flex items-center justify-center mb-1 shadow-sm`}>
              <Medal className="h-2.5 w-2.5 text-white" />
            </div>
            <Avatar className={`h-9 w-9 ring-2 ${PODIUM_COLORS.bronze.ring} shadow-md bg-white`}>
              <AvatarImage src={third.logo_url} />
              <AvatarFallback className="bg-white text-amber-700 font-bold text-[10px]">
                {third.chapter?.substring(0, 2) || third.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`w-full h-10 ${PODIUM_COLORS.bronze.bg} rounded-t-lg mt-1.5 flex items-center justify-center shadow-inner`}>
              <span className="text-white font-bold text-base">3</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-yellow-200/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-violet-200/20 to-purple-200/10 rounded-full blur-xl pointer-events-none" />
      </Card>
    </Link>
  );
}
