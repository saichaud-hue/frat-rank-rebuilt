import { useState } from 'react';
import { ChevronUp, ChevronDown, MessageCircle, Flame, Clock, TrendingUp, Flag, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportContentDialog from '@/components/moderation/ReportContentDialog';

export interface Post {
  id: string;
  text: string;
  anonymous_name: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_date: string;
  user_vote?: 1 | -1 | null;
  is_hot?: boolean;
}

interface PostCardProps {
  post: Post;
  onUpvote: () => void;
  onDownvote: () => void;
  onOpenThread: () => void;
  isLeading?: boolean;
}

// Generate consistent anonymous name from post id
const getAnonymousColor = (name: string) => {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-lime-500 to-green-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function PostCard({ post, onUpvote, onDownvote, onOpenThread, isLeading }: PostCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const netVotes = post.upvotes - post.downvotes;
  const isHot = post.is_hot || netVotes >= 5;
  const colorGradient = getAnonymousColor(post.anonymous_name);
  
  return (
    <>
    <button
      onClick={onOpenThread}
      className={cn(
        "w-full text-left rounded-2xl bg-card p-4 transition-all duration-200",
        "active:scale-[0.98] hover:shadow-xl",
        isLeading && "animate-float shadow-2xl",
        isHot ? "shadow-lg" : "shadow-duke"
      )}
    >
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onUpvote(); }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
              post.user_vote === 1 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                : "bg-muted hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500"
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className={cn(
            "text-sm font-bold tabular-nums min-w-[24px] text-center",
            netVotes > 0 ? "text-emerald-500" : netVotes < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {netVotes}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDownvote(); }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
              post.user_vote === -1 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                : "bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
            )}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Anonymous name + badges */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", colorGradient)}>
              {post.anonymous_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground">{post.anonymous_name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: false })}
            </span>
            {isHot && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-orange-500 animate-pulse-subtle">
                <Flame className="h-3.5 w-3.5" />
                Hot
              </span>
            )}
            {isLeading && !isHot && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary animate-pulse-subtle">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </span>
            )}
          </div>

          {/* Post text */}
          <p className="text-[15px] leading-relaxed text-foreground line-clamp-4 mb-3">
            {post.text}
          </p>

          {/* Comment count and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportDialog(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </button>

    <ReportContentDialog
      open={showReportDialog}
      onOpenChange={setShowReportDialog}
      contentType="chat_message"
      contentId={post.id}
      contentPreview={post.text.slice(0, 100)}
    />
    </>
  );
}
