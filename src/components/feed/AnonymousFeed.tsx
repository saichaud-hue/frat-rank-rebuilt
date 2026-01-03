import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Flame, Clock, TrendingUp, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import PostCard, { type Post } from './PostCard';
import ThreadView, { type Comment } from './ThreadView';
import { useAuth } from '@/contexts/AuthContext';
import { chatMessageQueries, chatMessageVoteQueries, getCurrentUser } from '@/lib/supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SortType = 'hot' | 'new' | 'top';

// Anonymous name generator
const adjectives = ['Swift', 'Brave', 'Clever', 'Mighty', 'Silent', 'Wild', 'Bold', 'Calm', 'Wise', 'Quick', 'Noble', 'Proud', 'Fierce', 'Keen', 'Sly'];
const animals = ['Fox', 'Wolf', 'Bear', 'Eagle', 'Hawk', 'Lion', 'Tiger', 'Owl', 'Falcon', 'Panther', 'Lynx', 'Raven', 'Badger', 'Stag', 'Viper'];

const generateAnonymousName = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const adjIndex = Math.abs(hash) % adjectives.length;
  const animalIndex = Math.abs(hash >> 8) % animals.length;
  return `${adjectives[adjIndex]}${animals[animalIndex]}`;
};

export default function AnonymousFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('hot');
  const [showComposer, setShowComposer] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const userAnonName = useMemo(() => {
    const seed = user?.id || `anon-${Date.now()}`;
    return generateAnonymousName(seed);
  }, [user?.id]);

  // Load posts and comments from Supabase
  const loadData = useCallback(async () => {
    try {
      const messages = await chatMessageQueries.list();
      
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

      // Transform to Post format
      const transformedPosts: Post[] = topLevelPosts.map(msg => {
        const commentCount = allComments.filter(c => c.parent_message_id === msg.id).length;
        const netVotes = (msg.upvotes || 0) - (msg.downvotes || 0);
        return {
          id: msg.id,
          text: msg.text,
          anonymous_name: generateAnonymousName(msg.user_id),
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

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('anonymous-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Sort posts
  const sortedPosts = useMemo(() => {
    const now = Date.now();
    return [...posts].sort((a, b) => {
      switch (sortBy) {
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
  }, [posts, sortBy]);

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to post');
      return;
    }

    setSubmitting(true);
    try {
      await chatMessageQueries.create({
        text: newPostText.trim(),
        user_id: currentUser.id,
        parent_message_id: null,
        mentioned_fraternity_id: null,
        mentioned_party_id: null,
        upvotes: 0,
        downvotes: 0,
      });
      
      setNewPostText('');
      setShowComposer(false);
      toast.success('Post created!');
      loadData();
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostVote = async (postId: string, direction: 1 | -1) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to vote');
      return;
    }

    const currentVote = userVotes[postId] || 0;
    
    // Determine next vote using deterministic state machine
    // Rule A: Clicking UP - if +1 -> 0, if 0 -> +1, if -1 -> +1
    // Rule B: Clicking DOWN - if -1 -> 0, if 0 -> -1, if +1 -> -1
    let nextVote: number;
    if (direction === 1) {
      // Clicking UP
      nextVote = currentVote === 1 ? 0 : 1;
    } else {
      // Clicking DOWN  
      nextVote = currentVote === -1 ? 0 : -1;
    }

    // Calculate delta for upvotes and downvotes
    // Step 1: Remove current vote
    // Step 2: Apply next vote
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    
    // Remove current vote
    if (currentVote === 1) upvoteDelta -= 1;
    if (currentVote === -1) downvoteDelta -= 1;
    
    // Apply next vote
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
      }

      // Fetch the current message state from server to get accurate counts
      const { data: currentMessage } = await supabase
        .from('chat_messages')
        .select('upvotes, downvotes')
        .eq('id', postId)
        .single();

      if (currentMessage) {
        // Apply the delta to the server's current state
        const newUpvotes = Math.max(0, (currentMessage.upvotes || 0) + upvoteDelta);
        const newDownvotes = Math.max(0, (currentMessage.downvotes || 0) + downvoteDelta);
        
        await chatMessageQueries.update(postId, { upvotes: newUpvotes, downvotes: newDownvotes });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to save vote');
      loadData(); // Revert on error
    }
  };

  const handleCommentVote = async (commentId: string, direction: 1 | -1) => {
    if (!selectedPost) return;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to vote');
      return;
    }

    const currentVote = userVotes[commentId] || 0;
    
    // Determine next vote using deterministic state machine
    let nextVote: number;
    if (direction === 1) {
      nextVote = currentVote === 1 ? 0 : 1;
    } else {
      nextVote = currentVote === -1 ? 0 : -1;
    }

    // Calculate delta
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
      // Save the vote
      if (nextVote === 0) {
        await chatMessageVoteQueries.delete(currentUser.id, commentId);
      } else {
        await chatMessageVoteQueries.upsert(currentUser.id, commentId, nextVote);
      }

      // Fetch current server state and apply delta
      const { data: currentMessage } = await supabase
        .from('chat_messages')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();

      if (currentMessage) {
        const newUpvotes = Math.max(0, (currentMessage.upvotes || 0) + upvoteDelta);
        const newDownvotes = Math.max(0, (currentMessage.downvotes || 0) + downvoteDelta);
        
        await chatMessageQueries.update(commentId, { upvotes: newUpvotes, downvotes: newDownvotes });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to save vote');
      loadData();
    }
  };

  const handleAddComment = async (text: string, parentId?: string) => {
    if (!selectedPost) return;
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      await chatMessageQueries.create({
        text,
        user_id: currentUser.id,
        parent_message_id: selectedPost.id,
        mentioned_fraternity_id: null,
        mentioned_party_id: null,
        upvotes: 0,
        downvotes: 0,
      });

      toast.success('Comment added!');
      loadData();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
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
    <div className="flex flex-col h-full">
      {/* Sort tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
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
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setShowComposer(true)}
          className="rounded-full px-5 h-12 bg-foreground text-background shadow-xl font-semibold text-base hover:bg-foreground/90 gap-1.5"
        >
          <Plus className="h-5 w-5" />
          Post
        </Button>
      </div>

      {/* Composer sheet */}
      <Sheet open={showComposer} onOpenChange={setShowComposer}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-3xl"
          style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        >
          <div className="p-4 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Post</h2>
              <span className="text-sm text-muted-foreground">Posting as {userAnonName}</span>
            </div>
            <Textarea
              placeholder="What's on your mind?"
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              className="min-h-[120px] resize-none rounded-xl text-base"
              autoFocus
            />
            <Button
              onClick={handleCreatePost}
              disabled={!newPostText.trim() || submitting}
              className="w-full rounded-xl gradient-primary h-12"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Post</>}
            </Button>
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
