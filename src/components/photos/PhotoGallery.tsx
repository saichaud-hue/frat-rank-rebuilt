import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Loader2, Send, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44, type PartyPhoto, type PartyPhotoVote, type PartyPhotoComment, type PartyPhotoCommentVote } from '@/api/base44Client';
import { formatTimeAgo } from '@/utils';
import { recalculatePhotoVotes, recomputePartyCoverPhoto } from './photoUtils';

interface PhotoWithVote extends PartyPhoto {
  userVote?: 1 | -1 | null;
}

interface CommentWithVote extends PartyPhotoComment {
  userVote?: 1 | -1 | null;
}

interface PhotoGalleryProps {
  photos: PhotoWithVote[];
  initialPhotoIndex: number;
  partyId: string;
  currentUserId: string | null;
  onClose: () => void;
  onPhotosUpdated: () => void;
}

export default function PhotoGallery({ 
  photos: initialPhotos, 
  initialPhotoIndex, 
  partyId,
  currentUserId,
  onClose, 
  onPhotosUpdated 
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [photos, setPhotos] = useState<PhotoWithVote[]>(initialPhotos);
  const [votingPhotoId, setVotingPhotoId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithVote[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myCommentVotes, setMyCommentVotes] = useState<Record<string, 1 | -1>>({});

  const currentPhoto = photos[currentIndex];

  const loadComments = useCallback(async () => {
    if (!currentPhoto) return;
    
    setLoadingComments(true);
    try {
      const data = await base44.entities.PartyPhotoComment.filter(
        { party_photo_id: currentPhoto.id },
        '-created_date'
      );

      // Get user's votes
      let userVotes: PartyPhotoCommentVote[] = [];
      if (currentUserId) {
        userVotes = await base44.entities.PartyPhotoCommentVote.filter({
          party_photo_id: currentPhoto.id,
          user_id: currentUserId,
        });
      }

      const commentsWithVotes: CommentWithVote[] = data.map(comment => ({
        ...comment,
        userVote: userVotes.find(v => v.comment_id === comment.id)?.value || null,
      }));

      // Sort by score then newest
      commentsWithVotes.sort((a, b) => {
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });

      setComments(commentsWithVotes);

      // Build vote map
      const voteMap: Record<string, 1 | -1> = {};
      userVotes.forEach(v => {
        voteMap[v.comment_id] = v.value;
      });
      setMyCommentVotes(voteMap);
    } catch (error) {
      console.error('Failed to load photo comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [currentPhoto, currentUserId]);

  useEffect(() => {
    loadComments();
  }, [currentIndex, loadComments]);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handlePhotoVote = async (voteValue: 1 | -1) => {
    if (!currentUserId || !currentPhoto) return;

    setVotingPhotoId(currentPhoto.id);

    try {
      const existingVotes = await base44.entities.PartyPhotoVote.filter({
        party_photo_id: currentPhoto.id,
        user_id: currentUserId,
      });
      const existingVote = existingVotes[0];

      if (existingVote) {
        if (existingVote.value === voteValue) {
          await base44.entities.PartyPhotoVote.delete(existingVote.id);
        } else {
          await base44.entities.PartyPhotoVote.update(existingVote.id, { value: voteValue });
        }
      } else {
        await base44.entities.PartyPhotoVote.create({
          party_photo_id: currentPhoto.id,
          party_id: partyId,
          user_id: currentUserId,
          value: voteValue,
        });
      }

      await recalculatePhotoVotes(currentPhoto.id);
      await recomputePartyCoverPhoto(partyId);
      onPhotosUpdated();
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setVotingPhotoId(null);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId || !currentPhoto) return;

    setSubmitting(true);
    try {
      await base44.entities.PartyPhotoComment.create({
        party_photo_id: currentPhoto.id,
        party_id: partyId,
        user_id: currentUserId,
        text: newComment.trim(),
        upvotes: 0,
        downvotes: 0,
      });

      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentVote = async (commentId: string, value: 1 | -1) => {
    if (!currentUserId || !currentPhoto) return;

    try {
      const existing = await base44.entities.PartyPhotoCommentVote.filter({
        comment_id: commentId,
        user_id: currentUserId,
      });
      const existingVote = existing[0];

      if (!existingVote) {
        await base44.entities.PartyPhotoCommentVote.create({
          comment_id: commentId,
          party_photo_id: currentPhoto.id,
          user_id: currentUserId,
          value,
        });
        setMyCommentVotes(prev => ({ ...prev, [commentId]: value }));
      } else if (existingVote.value === value) {
        await base44.entities.PartyPhotoCommentVote.delete(existingVote.id);
        setMyCommentVotes(prev => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      } else {
        await base44.entities.PartyPhotoCommentVote.update(existingVote.id, { value });
        setMyCommentVotes(prev => ({ ...prev, [commentId]: value }));
      }

      // Recalculate comment votes
      const votes = await base44.entities.PartyPhotoCommentVote.filter({ comment_id: commentId });
      const upvotes = votes.filter(v => v.value === 1).length;
      const downvotes = votes.filter(v => v.value === -1).length;
      await base44.entities.PartyPhotoComment.update(commentId, { upvotes, downvotes });

      await loadComments();
    } catch (error) {
      console.error('Failed to vote on comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Delete associated votes first
      const votes = await base44.entities.PartyPhotoCommentVote.filter({ comment_id: commentId });
      for (const vote of votes) {
        await base44.entities.PartyPhotoCommentVote.delete(vote.id);
      }
      
      await base44.entities.PartyPhotoComment.delete(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const getNetScore = (photo: PhotoWithVote) => {
    return (photo.likes || 0) - (photo.dislikes || 0);
  };

  if (!currentPhoto) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-white/70">
          {currentIndex + 1} / {photos.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Photo section */}
        <div className="flex-1 flex items-center justify-center relative p-4">
          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <div className="flex flex-col items-center max-w-full">
            <img 
              src={currentPhoto.url} 
              alt={currentPhoto.caption || 'Party photo'}
              className="max-w-full max-h-[50vh] lg:max-h-[60vh] object-contain rounded-lg"
            />
            
            {/* Caption */}
            {currentPhoto.caption && (
              <p className="mt-3 text-white text-center font-medium max-w-md">
                {currentPhoto.caption}
              </p>
            )}
            <p className="text-sm text-white/60 mt-1">
              {formatTimeAgo(currentPhoto.created_date)}
            </p>

            {/* Vote controls */}
            <div className="mt-4 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className={`text-white border-white/30 hover:bg-white/20 ${
                  currentPhoto.userVote === 1 ? 'bg-green-500/40 border-green-500' : ''
                }`}
                onClick={() => handlePhotoVote(1)}
                disabled={votingPhotoId === currentPhoto.id || !currentUserId}
              >
                <ThumbsUp className={`h-4 w-4 mr-2 ${currentPhoto.userVote === 1 ? 'fill-current' : ''}`} />
                {currentPhoto.likes || 0}
              </Button>
              <span className={`text-lg font-bold ${
                getNetScore(currentPhoto) > 0 
                  ? 'text-green-400' 
                  : getNetScore(currentPhoto) < 0 
                    ? 'text-red-400' 
                    : 'text-white'
              }`}>
                {getNetScore(currentPhoto) > 0 ? '+' : ''}{getNetScore(currentPhoto)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className={`text-white border-white/30 hover:bg-white/20 ${
                  currentPhoto.userVote === -1 ? 'bg-red-500/40 border-red-500' : ''
                }`}
                onClick={() => handlePhotoVote(-1)}
                disabled={votingPhotoId === currentPhoto.id || !currentUserId}
              >
                <ThumbsDown className={`h-4 w-4 mr-2 ${currentPhoto.userVote === -1 ? 'fill-current' : ''}`} />
                {currentPhoto.dislikes || 0}
              </Button>
            </div>

            {/* Total reactions display */}
            <div className="mt-2 flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-green-400" />
                {currentPhoto.likes || 0} positive
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-red-400" />
                {currentPhoto.dislikes || 0} negative
              </span>
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="lg:w-80 xl:w-96 bg-background/95 backdrop-blur-sm flex flex-col max-h-[40vh] lg:max-h-full">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Comments ({comments.length})</h3>
          </div>

          <ScrollArea className="flex-1 p-4">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No comments yet. Be the first!
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const netScore = (comment.upvotes || 0) - (comment.downvotes || 0);
                  const myVote = myCommentVotes[comment.id];
                  const canDelete = currentUserId && comment.user_id === currentUserId;

                  return (
                    <div key={comment.id} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">
                              DS
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">Anonymous</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.created_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {netScore !== 0 && (
                            <Badge variant={netScore > 0 ? 'default' : 'destructive'} className="text-xs">
                              {netScore > 0 ? '+' : ''}{netScore}
                            </Badge>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-2">{comment.text}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCommentVote(comment.id, 1)}
                          className={`h-6 px-2 text-xs ${myVote === 1 ? 'text-emerald-600 bg-emerald-50' : ''}`}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {comment.upvotes || 0}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCommentVote(comment.id, -1)}
                          className={`h-6 px-2 text-xs ${myVote === -1 ? 'text-red-500 bg-red-50' : ''}`}
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          {comment.downvotes || 0}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Comment input */}
          <div className="p-4 border-t border-border space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none text-sm"
              rows={2}
            />
            <Button 
              onClick={handleSubmitComment} 
              disabled={!newComment.trim() || submitting || !currentUserId}
              className="w-full gradient-primary text-white"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}