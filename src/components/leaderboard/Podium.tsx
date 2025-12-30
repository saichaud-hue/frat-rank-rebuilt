import { Link } from 'react-router-dom';
import { Crown, Trophy, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type FraternityWithScores } from '@/utils/scoring';
import { createPageUrl, toGreekLetters } from '@/utils';

// Consistent medal colors across all podiums
const MEDAL_COLORS = {
  gold: {
    bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    ring: 'ring-amber-400',
    text: 'text-amber-600',
  },
  silver: {
    bg: 'bg-gradient-to-br from-slate-300 to-slate-400',
    ring: 'ring-slate-300',
    text: 'text-slate-600',
  },
  bronze: {
    bg: 'bg-gradient-to-br from-amber-600 to-amber-700',
    ring: 'ring-amber-600',
    text: 'text-amber-700',
  },
};

type PodiumVariant = 'summary' | 'detail';

interface PodiumProps {
  topThree: FraternityWithScores[];
  variant: PodiumVariant;
  getScore?: (frat: FraternityWithScores) => number | null;
  showLinks?: boolean;
}

export default function Podium({ topThree, variant, getScore, showLinks = true }: PodiumProps) {
  if (topThree.length < 3) return null;

  // Reorder for visual podium: [#2, #1, #3]
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];
  const rankOrder = [2, 1, 3];

  const isSummary = variant === 'summary';

  // Size configurations based on variant
  const sizes = isSummary
    ? {
        containerHeight: 'h-32',
        firstAvatar: 'h-14 w-14',
        secondAvatar: 'h-11 w-11',
        thirdAvatar: 'h-11 w-11',
        firstBadge: 'w-6 h-6',
        otherBadge: 'w-5 h-5',
        firstIcon: 'h-3.5 w-3.5',
        otherIcon: 'h-3 w-3',
        nameSize: 'text-xs',
        scoreSize: 'text-[10px]',
        maxNameWidth: 'max-w-[70px]',
        gap: 'gap-4',
        podiumFirst: 'w-16 h-8',
        podiumSecond: 'w-14 h-6',
        podiumThird: 'w-14 h-5',
      }
    : {
        containerHeight: 'h-44',
        firstAvatar: 'h-16 w-16',
        secondAvatar: 'h-12 w-12',
        thirdAvatar: 'h-11 w-11',
        firstBadge: 'w-8 h-8',
        otherBadge: 'w-6 h-6',
        firstIcon: 'h-4 w-4',
        otherIcon: 'h-3.5 w-3.5',
        nameSize: 'text-sm',
        scoreSize: 'text-xs',
        maxNameWidth: 'max-w-[80px]',
        gap: 'gap-6',
        podiumFirst: 'w-20 h-24',
        podiumSecond: 'w-16 h-16',
        podiumThird: 'w-14 h-12',
      };

  const renderPodiumEntry = (frat: FraternityWithScores, index: number) => {
    const rank = rankOrder[index];
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    const medalColor = isFirst ? MEDAL_COLORS.gold : isSecond ? MEDAL_COLORS.silver : MEDAL_COLORS.bronze;
    const RankIcon = isFirst ? Crown : isSecond ? Trophy : Medal;

    const avatarSize = isFirst ? sizes.firstAvatar : isSecond ? sizes.secondAvatar : sizes.thirdAvatar;
    const badgeSize = isFirst ? sizes.firstBadge : sizes.otherBadge;
    const iconSize = isFirst ? sizes.firstIcon : sizes.otherIcon;
    const podiumSize = isFirst ? sizes.podiumFirst : isSecond ? sizes.podiumSecond : sizes.podiumThird;

    const content = (
      <div
        className="flex flex-col items-center justify-end"
        style={{ order: isFirst ? 1 : isSecond ? 0 : 2 }}
      >
        {/* Rank badge */}
        <div className={`${medalColor.bg} ${badgeSize} rounded-full flex items-center justify-center mb-1.5 shadow-md`}>
          <RankIcon className={`${iconSize} text-white`} />
        </div>

        {/* Avatar */}
        <Avatar className={`${avatarSize} ring-4 ${medalColor.ring} shadow-lg bg-white`}>
          <AvatarImage src={frat.logo_url} alt={frat.name} />
          <AvatarFallback className={`font-bold ${medalColor.text} bg-white ${isSummary ? 'text-sm' : 'text-base'}`}>
            {toGreekLetters(frat.chapter?.substring(0, 2) || frat.name.substring(0, 2))}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <p className={`${sizes.nameSize} font-semibold text-white text-center mt-1.5 ${sizes.maxNameWidth} truncate`}>
          {frat.chapter || frat.name.split(' ')[0]}
        </p>

        {/* Score (only in detail variant) */}
        {!isSummary && getScore && (
          <p className={`${sizes.scoreSize} text-white/80 font-medium`}>
            {getScore(frat)?.toFixed(1) || '—'}
          </p>
        )}

        {/* Podium base (only in detail variant) */}
        {!isSummary && (
          <div className={`${podiumSize} bg-white/20 rounded-t-lg mt-2 backdrop-blur-sm`} />
        )}
      </div>
    );

    if (showLinks) {
      return (
        <Link
          key={frat.id}
          to={createPageUrl(`Fraternity?id=${frat.id}`)}
          className="active:scale-95 transition-transform flex flex-col items-center"
        >
          {content}
        </Link>
      );
    }

    return <div key={frat.id}>{content}</div>;
  };

  return (
    <div className={`relative flex items-end justify-center ${sizes.gap} ${sizes.containerHeight}`}>
      {podiumOrder.map((frat, index) => renderPodiumEntry(frat, index))}
    </div>
  );
}
