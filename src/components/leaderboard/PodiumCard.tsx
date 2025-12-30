import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Star, PartyPopper, TrendingUp, Trophy, Medal, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl, toGreekLetters } from '@/utils';

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
  cardBg: string;
  borderColor: string;
}> = {
  overall: {
    title: 'Overall',
    subtitle: 'Top performers',
    icon: Crown,
    iconBg: 'bg-amber-500',
    cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50',
    borderColor: 'border-amber-200/60',
  },
  reputation: {
    title: 'Fraternities',
    subtitle: 'Best reputation',
    icon: Star,
    iconBg: 'bg-violet-500',
    cardBg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100/50',
    borderColor: 'border-violet-200/60',
  },
  party: {
    title: 'Parties',
    subtitle: 'Best party hosts',
    icon: PartyPopper,
    iconBg: 'bg-rose-500',
    cardBg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100/50',
    borderColor: 'border-rose-200/60',
  },
  trending: {
    title: 'Trending',
    subtitle: 'Most active now',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500',
    cardBg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50',
    borderColor: 'border-emerald-200/60',
  },
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
        className={`relative overflow-hidden p-5 ${config.cardBg} border ${config.borderColor} shadow-sm active:scale-[0.98] transition-all duration-200 hover:shadow-lg group`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{config.title}</h3>
              <p className="text-sm text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <ChevronRight className="h-6 w-6 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Podium - Floating avatars style */}
        <div className="flex items-end justify-center gap-4 pb-2">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-1">
              <Trophy className="h-4 w-4 text-slate-400 mx-auto" />
            </div>
            <Avatar className="h-14 w-14 ring-2 ring-slate-300 bg-white shadow-md">
              <AvatarImage src={second.logo_url} />
              <AvatarFallback className="bg-white text-slate-700 font-bold text-sm">
                {toGreekLetters(second.chapter?.substring(0, 2) || second.name.substring(0, 2))}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-slate-600 mt-2 truncate max-w-[60px]">
              {second.chapter || second.name.substring(0, 5)}
            </p>
          </div>

          {/* 1st Place - Elevated */}
          <div className="flex flex-col items-center -mt-4">
            <div className="relative mb-1">
              <Crown className="h-5 w-5 text-amber-500 mx-auto" />
            </div>
            <Avatar className="h-16 w-16 ring-3 ring-amber-400 bg-white shadow-lg">
              <AvatarImage src={first.logo_url} />
              <AvatarFallback className="bg-white text-amber-600 font-bold text-base">
                {toGreekLetters(first.chapter?.substring(0, 2) || first.name.substring(0, 2))}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-slate-700 mt-2 truncate max-w-[60px]">
              {first.chapter || first.name.substring(0, 5)}
            </p>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-1">
              <Medal className="h-4 w-4 text-amber-600 mx-auto" />
            </div>
            <Avatar className="h-14 w-14 ring-2 ring-amber-600/50 bg-white shadow-md">
              <AvatarImage src={third.logo_url} />
              <AvatarFallback className="bg-white text-amber-700 font-bold text-sm">
                {toGreekLetters(third.chapter?.substring(0, 2) || third.name.substring(0, 2))}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-slate-600 mt-2 truncate max-w-[60px]">
              {third.chapter || third.name.substring(0, 5)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
