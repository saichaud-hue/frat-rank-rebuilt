import { Link } from 'react-router-dom';
import { Crown, Trophy, Medal, ChevronRight, Flame, Star, PartyPopper, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl } from '@/utils';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

interface PodiumCardProps {
  category: CategoryType;
  topThree: FraternityWithScores[];
}

const categoryConfig = {
  overall: {
    title: 'Overall',
    subtitle: 'Top performers',
    icon: Crown,
    gradient: 'from-amber-500 via-yellow-400 to-amber-600',
    bgGradient: 'from-amber-50 to-yellow-50',
    borderColor: 'border-amber-200/50',
    iconColor: 'text-amber-500',
  },
  reputation: {
    title: 'Fraternities',
    subtitle: 'Best reputation',
    icon: Star,
    gradient: 'from-indigo-500 via-purple-500 to-indigo-600',
    bgGradient: 'from-indigo-50 to-purple-50',
    borderColor: 'border-indigo-200/50',
    iconColor: 'text-indigo-500',
  },
  party: {
    title: 'Parties',
    subtitle: 'Best party hosts',
    icon: PartyPopper,
    gradient: 'from-rose-500 via-pink-500 to-rose-600',
    bgGradient: 'from-rose-50 to-pink-50',
    borderColor: 'border-rose-200/50',
    iconColor: 'text-rose-500',
  },
  trending: {
    title: 'Trending',
    subtitle: 'Most active now',
    icon: TrendingUp,
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200/50',
    iconColor: 'text-emerald-500',
  },
};

export default function PodiumCard({ category, topThree }: PodiumCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  // Reorder for visual podium: [#2, #1, #3]
  const podiumOrder = topThree.length >= 3 
    ? [topThree[1], topThree[0], topThree[2]] 
    : topThree;
  const rankOrder = [2, 1, 3];

  return (
    <Link to={createPageUrl(`Rankings?category=${category}`)}>
      <Card 
        className={`relative overflow-hidden p-4 bg-gradient-to-br ${config.bgGradient} ${config.borderColor} border-2 active:scale-[0.98] transition-all duration-200 hover:shadow-lg group`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{config.title}</h3>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Mini Podium */}
        <div className="flex items-end justify-center gap-2 h-24">
          {podiumOrder.map((frat, index) => {
            if (!frat) return null;
            const rank = rankOrder[index];
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            const isThird = rank === 3;

            const height = isFirst ? 'h-20' : isSecond ? 'h-16' : 'h-14';
            const avatarSize = isFirst ? 'h-10 w-10' : 'h-8 w-8';
            const RankIcon = isFirst ? Crown : isSecond ? Trophy : Medal;
            const rankBg = isFirst 
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500' 
              : isSecond 
                ? 'bg-gradient-to-br from-slate-300 to-slate-400' 
                : 'bg-gradient-to-br from-amber-600 to-amber-700';

            return (
              <div 
                key={frat.id} 
                className={`flex flex-col items-center ${height} justify-end`}
                style={{ order: isFirst ? 1 : isSecond ? 0 : 2 }}
              >
                {/* Rank badge */}
                <div className={`${rankBg} w-5 h-5 rounded-full flex items-center justify-center mb-1 shadow-sm`}>
                  <RankIcon className="h-3 w-3 text-white" />
                </div>
                
                {/* Avatar */}
                <Avatar className={`${avatarSize} ring-2 ring-white shadow-md`}>
                  <AvatarImage src={frat.logo_url} alt={frat.name} />
                  <AvatarFallback className={`text-xs font-bold ${config.iconColor} bg-white`}>
                    {frat.chapter?.substring(0, 2) || frat.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <p className="text-[10px] font-medium text-center mt-1 line-clamp-1 max-w-[60px]">
                  {frat.chapter || frat.name.split(' ')[0]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Decorative glow */}
        <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${config.gradient} opacity-10 rounded-full blur-2xl`} />
      </Card>
    </Link>
  );
}
