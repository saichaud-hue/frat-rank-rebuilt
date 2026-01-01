import { base44, type PartyPhoto } from '@/api/base44Client';

/**
 * Recomputes the party cover photo - but only if the party doesn't already have one.
 * Cover photos set during party creation are preserved and never overwritten by user uploads.
 */
export async function recomputePartyCoverPhoto(partyId: string): Promise<void> {
  try {
    // Check if party already has a cover photo set at creation
    const party = await base44.entities.Party.get(partyId);
    
    // If party already has a cover photo, don't override it with user uploads
    if (party?.display_photo_url) {
      return;
    }
    
    // Party has no cover photo - we won't auto-set one from user uploads
    // Cover photos should only come from party creation
  } catch (error) {
    console.error('Failed to check party cover photo:', error);
  }
}

/**
 * Recalculates the likes and dislikes counts for a photo from votes.
 */
export async function recalculatePhotoVotes(photoId: string): Promise<{ likes: number; dislikes: number }> {
  const votes = await base44.entities.PartyPhotoVote.filter({ party_photo_id: photoId });
  
  const likes = votes.filter(v => v.value === 1).length;
  const dislikes = votes.filter(v => v.value === -1).length;

  await base44.entities.PartyPhoto.update(photoId, { likes, dislikes });

  return { likes, dislikes };
}
