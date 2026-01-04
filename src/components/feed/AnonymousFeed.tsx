import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Flame, Clock, TrendingUp, Loader2, Send, AtSign, Trophy, BarChart3, X, ChevronLeft, Swords, ListOrdered, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import PostCard, { type Post } from './PostCard';
import ThreadView, { type Comment } from './ThreadView';
import { useAuth } from '@/contexts/AuthContext';
import { chatMessageQueries, chatMessageVoteQueries, getCurrentUser, type Fraternity } from '@/lib/supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRateLimit } from '@/hooks/useRateLimit';
import { postSchema, commentSchema, validateInput } from '@/lib/validationSchemas';
import { getFratGreek, getFratShorthand } from '@/utils';
import FratBattleGame from '@/components/activity/FratBattleGame';
import { awardPoints } from '@/utils/points';
import { recordUserAction } from '@/utils/streak';

type SortType = 'hot' | 'new' | 'top';

interface AnonymousFeedProps {
  initialSort?: SortType;
}

// Anonymous name generator - ensures unique names per user_id
const adjectives = ['Swift', 'Brave', 'Clever', 'Mighty', 'Silent', 'Wild', 'Bold', 'Calm', 'Wise', 'Quick', 'Noble', 'Proud', 'Fierce', 'Keen', 'Sly', 'Loyal', 'Sharp', 'Free', 'True', 'Dark'];
const animals = ['Fox', 'Wolf', 'Bear', 'Eagle', 'Hawk', 'Lion', 'Tiger', 'Owl', 'Falcon', 'Panther', 'Lynx', 'Raven', 'Badger', 'Stag', 'Viper', 'Otter', 'Moose', 'Crane', 'Shark', 'Cobra'];

const generateAnonymousName = (seed: string) => {
  // Generate a more robust hash from the seed
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = char + ((hash1 << 5) - hash1);
    hash2 = char + ((hash2 << 7) - hash2) + i;
  }
  const adjIndex = Math.abs(hash1) % adjectives.length;
  const animalIndex = Math.abs(hash1 >> 8) % animals.length;
  // Add a unique number suffix (10-99) based on secondary hash to prevent collisions
  const numSuffix = 10 + (Math.abs(hash2) % 90);
  return `${adjectives[adjIndex]}${animals[animalIndex]}${numSuffix}`;
};

export default function AnonymousFeed({ initialSort }: AnonymousFeedProps) {
  const { user } = useAuth();
  const { withRateLimit } = useRateLimit();
  const [posts, setPosts] = useState<Post[]>([]);
  const [frozenPostOrder, setFrozenPostOrder] = useState<string[]>([]); // Order frozen at load time
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>(initialSort || 'hot');
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<'menu' | 'text' | 'mention' | 'ranking' | 'ranking-battle' | 'ranking-manual' | 'poll'>('menu');
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Poll creation state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  // Ranking creation state - map tier to frat id
  const [rankingTiers, setRankingTiers] = useState<Record<string, { id: string; name: string } | null>>({
    'Upper Touse': null,
    'Touse': null,
    'Lower Touse': null,
    'Upper Mouse': null,
    'Mouse': null,
    'Lower Mouse': null,
    'Upper Bouse': null,
    'Bouse': null,
    'Lower Bouse': null,
  });
  const [activeTier, setActiveTier] = useState<string | null>(null);
  
  // Mention state
  const [mentionText, setMentionText] = useState('');
  const [selectedMention, setSelectedMention] = useState<{ id: string; name: string } | null>(null);
  
  // Fraternities list (full type for FratBattleGame)
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  
  // Lock to prevent rapid clicking from causing duplicate votes
  const votingLock = useRef<Set<string>>(new Set());
  
  // Load fraternities with full data for FratBattleGame
  useEffect(() => {
    const loadFrats = async () => {
      const { data } = await supabase.from('fraternities').select('*').order('name');
      if (data) setFraternities(data as Fraternity[]);
    };
    loadFrats();
  }, []);

  const userAnonName = useMemo(() => {
    const seed = user?.id || `anon-${Date.now()}`;
    return generateAnonymousName(seed);
  }, [user?.id]);

  // Load posts and comments from Supabase
  const loadData = useCallback(async () => {
    try {
      const messages = await chatMessageQueries.listRecent(2);
      
      // Separate top-level posts from comments
      const topLevelPosts = messages.filter(m => !m.parent_message_id);
      const allComments = messages.filter(m => m.parent_message_id);

      // Load user's votes if logged in
      let votesMap: Record<string, number> = {};
      if (user?.id) {
        const votes = await chatMessageVoteQueries.listByUser(user.id);
        votes.forEach(v => {
          votesMap[v.message_id] = v.value || 0;
        });
      }
      setUserVotes(votesMap);

      // Get unique user ids to fetch their points
      const userIds = [...new Set(messages.map(m => m.user_id))];
      
      // Fetch points for all users in parallel
      const userPointsMap: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('user_id, total_points')
          .in('user_id', userIds);
        
        if (streakData) {
          streakData.forEach(s => {
            userPointsMap[s.user_id] = s.total_points || 0;
          });
        }
      }

      // Transform to Post format
      const transformedPosts: Post[] = topLevelPosts.map(msg => {
        const commentCount = allComments.filter(c => c.parent_message_id === msg.id).length;
        const netVotes = (msg.upvotes || 0) - (msg.downvotes || 0);
        return {
          id: msg.id,
          text: msg.text,
          anonymous_name: generateAnonymousName(msg.user_id),
          user_id: msg.user_id,
          user_points: userPointsMap[msg.user_id] || 0,
          upvotes: msg.upvotes || 0,
          downvotes: msg.downvotes || 0,
          comment_count: commentCount,
          created_date: msg.created_at || new Date().toISOString(),
          user_vote: votesMap[msg.id] as 1 | -1 | null | undefined,
          is_hot: netVotes >= 20,
        };
      });

      setPosts(transformedPosts);

      // Group comments by parent post
      const commentsMap: Record<string, Comment[]> = {};
      allComments.forEach(msg => {
        const postId = msg.parent_message_id!;
        if (!commentsMap[postId]) commentsMap[postId] = [];
        commentsMap[postId].push({
          id: msg.id,
          text: msg.text,
          anonymous_name: generateAnonymousName(msg.user_id),
          user_id: msg.user_id,
          user_points: userPointsMap[msg.user_id] || 0,
          upvotes: msg.upvotes || 0,
          downvotes: msg.downvotes || 0,
          created_date: msg.created_at || new Date().toISOString(),
          user_vote: votesMap[msg.id] as 1 | -1 | null | undefined,
          parent_id: null, // For nested replies we'd need another field
        });
      });
      setComments(commentsMap);

    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort posts and freeze order on load - recalculates only when sortBy changes or data reloads
  const sortPosts = useCallback((postsToSort: Post[], sortType: SortType): Post[] => {
    const now = Date.now();
    return [...postsToSort].sort((a, b) => {
      switch (sortType) {
        case 'new':
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case 'top':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'hot':
        default:
          const aScore = (a.upvotes - a.downvotes) + a.comment_count * 2;
          const bScore = (b.upvotes - b.downvotes) + b.comment_count * 2;
          const aAge = (now - new Date(a.created_date).getTime()) / (1000 * 60 * 60);
          const bAge = (now - new Date(b.created_date).getTime()) / (1000 * 60 * 60);
          const aHot = aScore / Math.pow(aAge + 2, 1.5);
          const bHot = bScore / Math.pow(bAge + 2, 1.5);
          return bHot - aHot;
      }
    });
  }, []);

  // Freeze post order when data loads - this order stays fixed until next reload
  useEffect(() => {
    if (posts.length > 0 && frozenPostOrder.length === 0) {
      const sorted = sortPosts(posts, sortBy);
      setFrozenPostOrder(sorted.map(p => p.id));
    }
  }, [posts, sortBy, frozenPostOrder.length, sortPosts]);

  // When sort type changes, re-freeze the order
  const handleSortChange = (newSort: SortType) => {
    setSortBy(newSort);
    const sorted = sortPosts(posts, newSort);
    setFrozenPostOrder(sorted.map(p => p.id));
  };

  // Display posts in frozen order, but with updated vote data
  const sortedPosts = useMemo(() => {
    if (frozenPostOrder.length === 0) return posts;
    
    const postsMap = new Map(posts.map(p => [p.id, p]));
    const ordered: Post[] = [];
    
    // Add posts in frozen order
    for (const id of frozenPostOrder) {
      const post = postsMap.get(id);
      if (post) ordered.push(post);
    }
    
    // Add any new posts that aren't in frozen order (e.g., just created)
    for (const post of posts) {
      if (!frozenPostOrder.includes(post.id)) {
        ordered.unshift(post); // New posts go to top
      }
    }
    
    return ordered;
  }, [posts, frozenPostOrder]);

  const resetComposer = () => {
    setNewPostText('');
    setComposerMode('menu');
    setPollQuestion('');
    setPollOptions(['', '']);
    setRankingTiers({
      'Upper Touse': null, 'Touse': null, 'Lower Touse': null,
      'Upper Mouse': null, 'Mouse': null, 'Lower Mouse': null,
      'Upper Bouse': null, 'Bouse': null, 'Lower Bouse': null,
    });
    setActiveTier(null);
    setMentionText('');
    setSelectedMention(null);
    // Clear frozen order so new posts show correctly
    setFrozenPostOrder([]);
  };

  const handleCreatePost = async () => {
    let postText = newPostText;
    let mentionedFratId: string | null = null;

    // Build text based on mode
    if (composerMode === 'poll') {
      if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
        toast.error('Add a question and at least 2 options');
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      postText = `POLL:${pollQuestion}\n${validOptions.map(o => `OPTION:${o}`).join('\n')}`;
    } else if (composerMode === 'ranking-manual') {
      const filledTiers = Object.entries(rankingTiers).filter(([_, frat]) => frat !== null);
      if (filledTiers.length < 3) {
        toast.error('Fill in at least 3 tier rankings');
        return;
      }
      postText = `🏆 My Frat Ranking\n${filledTiers.map(([tier, frat]) => `${tier}: ${frat!.name}`).join('\n')}`;
    } else if (composerMode === 'mention' && selectedMention) {
      // Always include the frat tag in the post text
      postText = mentionText.trim() 
        ? `@${selectedMention.name} ${mentionText.trim()}`
        : `Shoutout to @${selectedMention.name}`;
      mentionedFratId = selectedMention.id;
    }

    // Validate input
    const validation = validateInput(postSchema, { text: postText });
    if (!validation.success) {
      toast.error('error' in validation ? validation.error : 'Invalid input');
      return;
    }
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to post');
      return;
    }

    setSubmitting(true);
    
    // Apply rate limiting
    const result = await withRateLimit('post', async () => {
      await chatMessageQueries.create({
        text: validation.data.text,
        user_id: currentUser.id,
        parent_message_id: null,
        mentioned_fraternity_id: mentionedFratId,
        mentioned_party_id: null,
        upvotes: 0,
        downvotes: 0,
      });
      return true;
    });
    
    if (result) {
      // Award points based on content type
      if (composerMode === 'poll') {
        await awardPoints('create_poll', 'Created a poll');
      } else {
        await awardPoints('create_post', 'Created a post');
      }
      await recordUserAction();
      
      resetComposer();
      setShowComposer(false);
      toast.success('Post created!');
      loadData();
    }
    
    setSubmitting(false);
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePostVote = async (postId: string, direction: 1 | -1) => {
    // Prevent rapid clicking - check if already voting on this post
    if (votingLock.current.has(postId)) {
      return;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to vote');
      return;
    }

    // Lock this post from further votes until complete
    votingLock.current.add(postId);

    const currentVote = userVotes[postId] || 0;
    
    // Determine next vote using deterministic state machine
    let nextVote: number;
    if (direction === 1) {
      nextVote = currentVote === 1 ? 0 : 1;
    } else {
      nextVote = currentVote === -1 ? 0 : -1;
    }

    // Calculate delta for upvotes and downvotes
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    
    if (currentVote === 1) upvoteDelta -= 1;
    if (currentVote === -1) downvoteDelta -= 1;
    if (nextVote === 1) upvoteDelta += 1;
    if (nextVote === -1) downvoteDelta += 1;

    // Optimistic update for posts list
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newUpvotes = Math.max(0, p.upvotes + upvoteDelta);
      const newDownvotes = Math.max(0, p.downvotes + downvoteDelta);
      return { 
        ...p, 
        upvotes: newUpvotes, 
        downvotes: newDownvotes, 
        user_vote: nextVote === 0 ? null : nextVote as 1 | -1 
      };
    }));
    
    setUserVotes(prev => ({ ...prev, [postId]: nextVote }));

    // Update selected post if viewing thread
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => {
        if (!prev) return null;
        const newUpvotes = Math.max(0, prev.upvotes + upvoteDelta);
        const newDownvotes = Math.max(0, prev.downvotes + downvoteDelta);
        return { 
          ...prev, 
          upvotes: newUpvotes, 
          downvotes: newDownvotes, 
          user_vote: nextVote === 0 ? null : nextVote as 1 | -1 
        };
      });
    }

    try {
      // First, save the user's vote (or delete if nextVote is 0)
      if (nextVote === 0) {
        await chatMessageVoteQueries.delete(currentUser.id, postId);
      } else {
        await chatMessageVoteQueries.upsert(currentUser.id, postId, nextVote);
        // Award points only for new votes (not toggles)
        if (currentVote === 0) {
          await awardPoints('vote_on_post', 'Voted on a post');
        }
      }

      // Use database function to recalculate votes (bypasses RLS for accurate counts)
      const { data, error } = await supabase.rpc('recalculate_message_votes', { p_message_id: postId });
      
      if (!error && data && data.length > 0) {
        const { new_upvotes, new_downvotes } = data[0];
        // Update local state with server truth
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, upvotes: new_upvotes, downvotes: new_downvotes } : p
        ));
        
        if (selectedPost?.id === postId) {
          setSelectedPost(prev => prev ? { ...prev, upvotes: new_upvotes, downvotes: new_downvotes } : null);
        }
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to save vote');
      loadData(); // Revert on error
    } finally {
      // Unlock this post
      votingLock.current.delete(postId);
    }
  };

  const handleCommentVote = async (commentId: string, direction: 1 | -1) => {
    if (!selectedPost) return;

    // Prevent rapid clicking
    if (votingLock.current.has(commentId)) {
      return;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to vote');
      return;
    }

    votingLock.current.add(commentId);

    const currentVote = userVotes[commentId] || 0;
    
    let nextVote: number;
    if (direction === 1) {
      nextVote = currentVote === 1 ? 0 : 1;
    } else {
      nextVote = currentVote === -1 ? 0 : -1;
    }

    let upvoteDelta = 0;
    let downvoteDelta = 0;
    
    if (currentVote === 1) upvoteDelta -= 1;
    if (currentVote === -1) downvoteDelta -= 1;
    if (nextVote === 1) upvoteDelta += 1;
    if (nextVote === -1) downvoteDelta += 1;

    // Optimistic update
    setComments(prev => {
      const postComments = prev[selectedPost.id] || [];
      const updated = postComments.map(c => {
        if (c.id !== commentId) return c;
        const newUpvotes = Math.max(0, c.upvotes + upvoteDelta);
        const newDownvotes = Math.max(0, c.downvotes + downvoteDelta);
        return { 
          ...c, 
          upvotes: newUpvotes, 
          downvotes: newDownvotes, 
          user_vote: nextVote === 0 ? null : nextVote as 1 | -1 
        };
      });
      return { ...prev, [selectedPost.id]: updated };
    });
    
    setUserVotes(prev => ({ ...prev, [commentId]: nextVote }));

    try {
      if (nextVote === 0) {
        await chatMessageVoteQueries.delete(currentUser.id, commentId);
      } else {
        await chatMessageVoteQueries.upsert(currentUser.id, commentId, nextVote);
      }

      // Use database function to recalculate votes
      const { data, error } = await supabase.rpc('recalculate_message_votes', { p_message_id: commentId });
      
      if (!error && data && data.length > 0) {
        const { new_upvotes, new_downvotes } = data[0];
        // Update local state with server truth
        setComments(prev => {
          const postComments = prev[selectedPost.id] || [];
          const updated = postComments.map(c => 
            c.id === commentId ? { ...c, upvotes: new_upvotes, downvotes: new_downvotes } : c
          );
          return { ...prev, [selectedPost.id]: updated };
        });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to save vote');
      loadData();
    } finally {
      votingLock.current.delete(commentId);
    }
  };

  const handleAddComment = async (text: string, parentId?: string) => {
    if (!selectedPost) return;
    
    // Validate input
    const validation = validateInput(commentSchema, { text });
    if (!validation.success) {
      toast.error('error' in validation ? validation.error : 'Invalid input');
      return;
    }
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    // Apply rate limiting
    const result = await withRateLimit('comment', async () => {
      await chatMessageQueries.create({
        text: validation.data.text,
        user_id: currentUser.id,
        parent_message_id: selectedPost.id,
        mentioned_fraternity_id: null,
        mentioned_party_id: null,
        upvotes: 0,
        downvotes: 0,
      });
      return true;
    });

    if (result) {
      toast.success('Comment added!');
      loadData();
    }
  };

  const sortOptions: { value: SortType; label: string; icon: typeof Flame }[] = [
    { value: 'hot', label: 'Hot', icon: Flame },
    { value: 'new', label: 'New', icon: Clock },
    { value: 'top', label: 'Top', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-tutorial="post-area" className="flex flex-col h-full">
      {/* Sort tabs */}
      <div data-tutorial="post-sort" className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                sortBy === opt.value 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-24">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Flame className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-1">No posts yet</p>
              <p className="text-sm text-muted-foreground mb-4">Be the first to share something!</p>
              <Button onClick={() => setShowComposer(true)} className="rounded-full gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>
          ) : (
            sortedPosts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                isLeading={index === 0 && sortBy === 'hot'}
                onUpvote={() => handlePostVote(post.id, 1)}
                onDownvote={() => handlePostVote(post.id, -1)}
                onOpenThread={() => setSelectedPost(post)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Floating compose button */}
      <div data-tutorial="create-post" className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setShowComposer(true)}
          className="rounded-full px-5 h-12 bg-foreground text-background shadow-xl font-semibold text-base hover:bg-foreground/90 gap-1.5"
        >
          <Plus className="h-5 w-5" />
          Post
        </Button>
      </div>

      {/* Composer sheet */}
      <Sheet open={showComposer} onOpenChange={(open) => {
        setShowComposer(open);
        if (!open) resetComposer();
      }}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
          style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        >
          <div className="p-4 pt-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              {composerMode !== 'menu' ? (
                <button onClick={() => setComposerMode('menu')} className="flex items-center gap-1 text-muted-foreground">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm">Back</span>
                </button>
              ) : (
                <h2 className="text-lg font-bold">New Post</h2>
              )}
              <span className="text-sm text-muted-foreground">as {userAnonName}</span>
            </div>

            {/* Mode: Menu (default) */}
            {composerMode === 'menu' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setComposerMode('text')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <Send className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Text Post</span>
                </button>
                <button
                  onClick={() => setComposerMode('mention')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <AtSign className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Mention</span>
                </button>
                <button
                  onClick={() => setComposerMode('ranking')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <span className="font-medium text-sm">Frat Ranking</span>
                </button>
                <button
                  onClick={() => setComposerMode('poll')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Poll</span>
                </button>
              </div>
            )}

            {/* Mode: Text Post */}
            {composerMode === 'text' && (
              <>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  className="min-h-[100px] resize-none rounded-xl text-base"
                />
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPostText.trim() || submitting}
                  className="w-full rounded-xl gradient-primary h-12"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Post</>}
                </Button>
              </>
            )}

            {/* Mode: Poll */}
            {composerMode === 'poll' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Create Poll</h3>
                </div>
                <Input
                  placeholder="Ask a question..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="rounded-xl"
                />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[i] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        className="flex-1 rounded-xl"
                      />
                      {pollOptions.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removePollOption(i)} className="shrink-0">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <Button variant="outline" onClick={addPollOption} className="w-full rounded-xl">
                      <Plus className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || submitting}
                  className="w-full rounded-xl gradient-primary h-12"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Post Poll</>}
                </Button>
              </>
            )}

            {/* Mode: Ranking choice (Battle vs Manual) */}
            {composerMode === 'ranking' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold">Create Frat Ranking</h3>
                </div>
                <p className="text-sm text-muted-foreground">Choose how to rank frats</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setComposerMode('ranking-battle')}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Swords className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Frat Battle</p>
                      <p className="text-xs text-muted-foreground">Head-to-head matchups to rank frats</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setComposerMode('ranking-manual')}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ListOrdered className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Manual Ranking</p>
                      <p className="text-xs text-muted-foreground">Pick frats for each tier yourself</p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Mode: Frat Battle Game */}
            {composerMode === 'ranking-battle' && (
              <FratBattleGame
                fraternities={fraternities}
                onComplete={async (ranking) => {
                  // Convert battle result to post text
                  const tierEntries = Object.entries(ranking).filter(([_, frat]) => frat);
                  if (tierEntries.length >= 3) {
                    const postText = `🏆 My Frat Ranking\n${tierEntries.map(([tier, frat]) => `${tier}: ${frat.name}`).join('\n')}`;
                    setNewPostText(postText);
                    
                    // Auto-submit
                    const currentUser = await getCurrentUser();
                    if (currentUser) {
                      setSubmitting(true);
                      const result = await withRateLimit('post', async () => {
                        await chatMessageQueries.create({
                          text: postText,
                          user_id: currentUser.id,
                          parent_message_id: null,
                          mentioned_fraternity_id: null,
                          mentioned_party_id: null,
                          upvotes: 0,
                          downvotes: 0,
                        });
                        return true;
                      });
                      if (result) {
                        resetComposer();
                        setShowComposer(false);
                        toast.success('Ranking posted!');
                        loadData();
                      }
                      setSubmitting(false);
                    }
                  }
                }}
                onClose={() => setComposerMode('ranking')}
                onShare={async (rankingData) => {
                  // Post to feed
                  const postText = `🏆 My Frat Ranking\n${rankingData.map(r => `${r.tier}: ${r.fratName}`).join('\n')}`;
                  const currentUser = await getCurrentUser();
                  if (currentUser) {
                    setSubmitting(true);
                    const result = await withRateLimit('post', async () => {
                      await chatMessageQueries.create({
                        text: postText,
                        user_id: currentUser.id,
                        parent_message_id: null,
                        mentioned_fraternity_id: null,
                        mentioned_party_id: null,
                        upvotes: 0,
                        downvotes: 0,
                      });
                      return true;
                    });
                    if (result) {
                      resetComposer();
                      setShowComposer(false);
                      toast.success('Ranking shared to feed!');
                      loadData();
                    }
                    setSubmitting(false);
                  }
                }}
              />
            )}

            {/* Mode: Manual Ranking */}
            {composerMode === 'ranking-manual' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold">Manual Frat Ranking</h3>
                </div>
                <p className="text-xs text-muted-foreground">Tap a tier to assign a frat (at least 3)</p>
                
                {activeTier ? (
                  // Frat picker for active tier
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => setActiveTier(null)} className="text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold">{activeTier}</span>
                    </div>
                    <ScrollArea className="h-[300px] -mx-2 px-2">
                      <div className="space-y-2 pb-4">
                        {fraternities.map((frat) => {
                          const isSelected = rankingTiers[activeTier]?.id === frat.id;
                          const isUsedElsewhere = Object.entries(rankingTiers).some(
                            ([tier, selected]) => tier !== activeTier && selected?.id === frat.id
                          );
                          return (
                            <button
                              key={frat.id}
                              onClick={() => {
                                setRankingTiers(prev => ({ ...prev, [activeTier]: { id: frat.id, name: frat.name } }));
                                setActiveTier(null);
                              }}
                              disabled={isUsedElsewhere}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                isSelected ? "bg-primary/10 border-2 border-primary" : "bg-muted/50 hover:bg-muted",
                                isUsedElsewhere && "opacity-40"
                              )}
                            >
                              <Avatar className="h-10 w-10 rounded-lg">
                                <AvatarImage src={frat.logo_url || undefined} alt={frat.name} />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                  {getFratGreek(frat.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{frat.chapter || getFratShorthand(frat.name)}</p>
                                <p className="text-xs text-muted-foreground truncate">{frat.name}</p>
                              </div>
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  // Tier list
                  <>
                    <ScrollArea className="h-[280px] -mx-2 px-2">
                      <div className="space-y-2">
                        {Object.entries(rankingTiers).map(([tier, selectedFrat]) => (
                          <button
                            key={tier}
                            onClick={() => setActiveTier(tier)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                          >
                            <span className={cn(
                              "w-24 text-xs font-medium shrink-0",
                              tier.includes('Touse') && "text-emerald-500",
                              tier.includes('Mouse') && "text-amber-500",
                              tier.includes('Bouse') && "text-red-500"
                            )}>{tier}</span>
                            {selectedFrat ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Avatar className="h-8 w-8 rounded-lg">
                                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                    {getFratGreek(selectedFrat.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium truncate">{selectedFrat.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Tap to select...</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button
                      onClick={handleCreatePost}
                      disabled={Object.values(rankingTiers).filter(v => v !== null).length < 3 || submitting}
                      className="w-full rounded-xl gradient-primary h-12"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Post Ranking</>}
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Mode: Mention */}
            {composerMode === 'mention' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <AtSign className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Mention a Frat</h3>
                </div>
                
                {selectedMention ? (
                  // Show selected frat and text input
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold text-xs">
                          {getFratGreek(selectedMention.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">@{selectedMention.name}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedMention(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="What do you want to say about this frat?"
                      value={mentionText}
                      onChange={(e) => setMentionText(e.target.value)}
                      className="min-h-[80px] resize-none rounded-xl text-base"
                    />
                    <Button
                      onClick={handleCreatePost}
                      disabled={!mentionText.trim() || submitting}
                      className="w-full rounded-xl gradient-primary h-12"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Post</>}
                    </Button>
                  </>
                ) : (
                  // Frat picker list
                  <>
                    <p className="text-xs text-muted-foreground">Select a frat to mention</p>
                    <ScrollArea className="h-[320px] -mx-2 px-2">
                      <div className="space-y-2 pb-4">
                        {fraternities.map((frat) => (
                          <button
                            key={frat.id}
                            onClick={() => setSelectedMention({ id: frat.id, name: frat.name })}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                          >
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage src={frat.logo_url || undefined} alt={frat.name} />
                              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                {getFratGreek(frat.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{frat.chapter || getFratShorthand(frat.name)}</p>
                              <p className="text-xs text-muted-foreground truncate">{frat.name}</p>
                            </div>
                            <AtSign className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Thread view */}
      <ThreadView
        post={selectedPost}
        comments={selectedPost ? (comments[selectedPost.id] || []) : []}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onPostVote={(dir) => selectedPost && handlePostVote(selectedPost.id, dir)}
        onCommentVote={handleCommentVote}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
