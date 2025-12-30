import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Star, PartyPopper, TrendingUp, Trophy, Medal, Flame, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl, getFratGreek, getFratShorthand, getScoreColor } from '@/utils';
import { cn } from '@/lib/utils';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

interface PodiumCardProps {
  category: CategoryType;
  topThree: FraternityWithScores[];
}

const categoryConfig: Record<CategoryType, { 
  title: string; 
  subtitle: string; 
  icon: LucideIcon; 
  iconBg: string;
  cardGradient: string;
  accentColor: string;
}> = {
  overall: {
    title: 'Overall',
    subtitle: 'Top performers',
    icon: Crown,
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    cardGradient: 'from-amber-50 via-yellow-50 to-orange-50',
    accentColor: 'text-amber-600',
  },
  reputation: {
    title: 'Fraternities',
    subtitle: 'Best reputation',
    icon: Star,
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    cardGradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
    accentColor: 'text-violet-600',
  },
  party: {
    title: 'Parties',
    subtitle: 'Best party hosts',
    icon: PartyPopper,
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    cardGradient: 'from-pink-50 via-rose-50 to-red-50',
    accentColor: 'text-rose-600',
  },
  trending: {
    title: 'Trending',
    subtitle: 'Most active now',
    icon: TrendingUp,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    cardGradient: 'from-emerald-50 via-teal-50 to-cyan-50',
    accentColor: 'text-emerald-600',
  },
};

const getScore = (frat: FraternityWithScores, category: CategoryType): number | null => {
  const s = frat.computedScores;
  if (!s) return null;
  switch (category) {
    case 'overall': return s.hasOverallData ? s.overall : null;
    case 'reputation': return s.hasRepData ? s.repAdj : null;
    case 'party': return s.hasPartyScoreData ? s.semesterPartyScore : null;
    case 'trending': return s.activityTrending;
    default: return null;
  }
};

export default function PodiumCard({ category, topThree }: PodiumCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  if (topThree.length < 3) return null;

  const second = topThree[1];
  const first = topThree[0];
  const third = topThree[2];

  return (
    <Link to={createPageUrl(`Rankings?category=${category}`)}>
      <Card 
        className={cn(
          "relative overflow-hidden p-5 border-0 shadow-lg active:scale-[0.98] transition-all duration-200 hover:shadow-xl group",
          `bg-gradient-to-br ${config.cardGradient}`
        )}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/30 to-transparent rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              config.iconBg
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
            <span className="text-sm font-medium">View all</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Podium - Enhanced floating avatars */}
        <div className="relative flex items-end justify-center gap-6 pb-2">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md">
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
            <Avatar className="h-16 w-16 ring-4 ring-slate-300 bg-white shadow-lg">
              <AvatarImage src={second.logo_url} />
              <AvatarFallback className="bg-white text-slate-700 font-bold text-sm">
                {getFratGreek(second.name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold text-foreground mt-2 truncate max-w-[70px]">
              {getFratShorthand(second.name)}
            </p>
            {getScore(second, category) !== null && (
              <Badge variant="secondary" className="mt-1 text-xs font-bold">
                {getScore(second, category)?.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* 1st Place - Elevated */}
          <div className="flex flex-col items-center -mt-6">
            <div className="relative mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg animate-pulse">
                <Crown className="h-5 w-5 text-white" />
              </div>
            </div>
            <Avatar className="h-20 w-20 ring-4 ring-amber-400 bg-white shadow-xl">
              <AvatarImage src={first.logo_url} />
              <AvatarFallback className={cn("bg-white font-bold text-base", config.accentColor)}>
                {getFratGreek(first.name)}
              </AvatarFallback>
            </Avatar>
            <p className={cn("text-base font-bold mt-2 truncate max-w-[80px]", config.accentColor)}>
              {getFratShorthand(first.name)}
            </p>
            {getScore(first, category) !== null && (
              <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
                {getScore(first, category)?.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-md">
                <Medal className="h-4 w-4 text-white" />
              </div>
            </div>
            <Avatar className="h-16 w-16 ring-4 ring-amber-600/60 bg-white shadow-lg">
              <AvatarImage src={third.logo_url} />
              <AvatarFallback className="bg-white text-amber-700 font-bold text-sm">
                {getFratGreek(third.name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold text-foreground mt-2 truncate max-w-[70px]">
              {getFratShorthand(third.name)}
            </p>
            {getScore(third, category) !== null && (
              <Badge variant="secondary" className="mt-1 text-xs font-bold">
                {getScore(third, category)?.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
