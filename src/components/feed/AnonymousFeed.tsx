import { useState, useMemo, useEffect } from 'react';
import { Plus, Flame, Clock, TrendingUp, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import PostCard, { type Post } from './PostCard';
import ThreadView, { type Comment } from './ThreadView';

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

// Get or create user's anonymous identity
const getUserAnonymousName = () => {
  const existing = localStorage.getItem('touse_anon_name');
  if (existing) return existing;
  const userId = localStorage.getItem('touse_user_id') || `anon-${Date.now()}`;
  const name = generateAnonymousName(userId);
  localStorage.setItem('touse_anon_name', name);
  return name;
};

export default function AnonymousFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('hot');
  const [showComposer, setShowComposer] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const userAnonName = getUserAnonymousName();

  // Load posts from localStorage (mock data layer)
  useEffect(() => {
    const loadData = () => {
      const savedPosts = localStorage.getItem('touse_anon_posts');
      const savedComments = localStorage.getItem('touse_anon_comments');
      
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      } else {
        // Seed with sample posts
        const samplePosts: Post[] = [
          {
            id: '1',
            text: "anyone else feel like the dining hall has been mid lately? like what happened to the good pasta 😭",
            anonymous_name: generateAnonymousName('user1'),
            upvotes: 24,
            downvotes: 3,
            comment_count: 5,
            created_date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            id: '2',
            text: "finals szn hitting different this semester. library was packed at 2am",
            anonymous_name: generateAnonymousName('user2'),
            upvotes: 18,
            downvotes: 1,
            comment_count: 3,
            created_date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          },
          {
            id: '3',
            text: "hot take: shooters on a tuesday is elite and i will not be taking criticism",
            anonymous_name: generateAnonymousName('user3'),
            upvotes: 45,
            downvotes: 12,
            comment_count: 8,
            created_date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            is_hot: true,
          },
          {
            id: '4',
            text: "just saw someone bring their emotional support peacock to class. duke really is different",
            anonymous_name: generateAnonymousName('user4'),
            upvotes: 67,
            downvotes: 2,
            comment_count: 12,
            created_date: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            is_hot: true,
          },
        ];
        setPosts(samplePosts);
        localStorage.setItem('touse_anon_posts', JSON.stringify(samplePosts));
      }
      
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      }
      
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Save posts to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('touse_anon_posts', JSON.stringify(posts));
    }
  }, [posts, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('touse_anon_comments', JSON.stringify(comments));
    }
  }, [comments, loading]);

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
          // Hot algorithm: score + recency bonus
          const aScore = (a.upvotes - a.downvotes) + a.comment_count * 2;
          const bScore = (b.upvotes - b.downvotes) + b.comment_count * 2;
          const aAge = (now - new Date(a.created_date).getTime()) / (1000 * 60 * 60); // hours
          const bAge = (now - new Date(b.created_date).getTime()) / (1000 * 60 * 60);
          const aHot = aScore / Math.pow(aAge + 2, 1.5);
          const bHot = bScore / Math.pow(bAge + 2, 1.5);
          return bHot - aHot;
      }
    });
  }, [posts, sortBy]);

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    setSubmitting(true);
    
    const newPost: Post = {
      id: `post-${Date.now()}`,
      text: newPostText.trim(),
      anonymous_name: userAnonName,
      upvotes: 0,
      downvotes: 0,
      comment_count: 0,
      created_date: new Date().toISOString(),
    };
    
    setPosts(prev => [newPost, ...prev]);
    setNewPostText('');
    setShowComposer(false);
    setSubmitting(false);
  };

  const handlePostVote = (postId: string, direction: 1 | -1) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const currentVote = p.user_vote;
      let upvotes = p.upvotes;
      let downvotes = p.downvotes;
      
      // Remove previous vote
      if (currentVote === 1) upvotes--;
      if (currentVote === -1) downvotes--;
      
      // Apply new vote (or remove if same direction)
      const newVote = currentVote === direction ? null : direction;
      if (newVote === 1) upvotes++;
      if (newVote === -1) downvotes++;
      
      return { ...p, upvotes, downvotes, user_vote: newVote };
    }));
    
    // Update selected post if viewing thread
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => {
        if (!prev) return null;
        const currentVote = prev.user_vote;
        let upvotes = prev.upvotes;
        let downvotes = prev.downvotes;
        if (currentVote === 1) upvotes--;
        if (currentVote === -1) downvotes--;
        const newVote = currentVote === direction ? null : direction;
        if (newVote === 1) upvotes++;
        if (newVote === -1) downvotes++;
        return { ...prev, upvotes, downvotes, user_vote: newVote };
      });
    }
  };

  const handleCommentVote = (commentId: string, direction: 1 | -1) => {
    if (!selectedPost) return;
    
    setComments(prev => {
      const postComments = prev[selectedPost.id] || [];
      const updated = postComments.map(c => {
        if (c.id !== commentId) return c;
        const currentVote = c.user_vote;
        let upvotes = c.upvotes;
        let downvotes = c.downvotes;
        if (currentVote === 1) upvotes--;
        if (currentVote === -1) downvotes--;
        const newVote = currentVote === direction ? null : direction;
        if (newVote === 1) upvotes++;
        if (newVote === -1) downvotes++;
        return { ...c, upvotes, downvotes, user_vote: newVote };
      });
      return { ...prev, [selectedPost.id]: updated };
    });
  };

  const handleAddComment = async (text: string, parentId?: string) => {
    if (!selectedPost) return;
    
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      text,
      anonymous_name: userAnonName,
      upvotes: 0,
      downvotes: 0,
      created_date: new Date().toISOString(),
      parent_id: parentId || null,
    };
    
    setComments(prev => ({
      ...prev,
      [selectedPost.id]: [...(prev[selectedPost.id] || []), newComment],
    }));
    
    // Update comment count on post
    setPosts(prev => prev.map(p => 
      p.id === selectedPost.id 
        ? { ...p, comment_count: p.comment_count + 1 }
        : p
    ));
    setSelectedPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
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
      <div className="absolute bottom-20 right-4">
        <Button
          onClick={() => setShowComposer(true)}
          size="lg"
          className="rounded-full w-14 h-14 gradient-primary shadow-xl shadow-primary/30"
        >
          <Plus className="h-6 w-6" />
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
