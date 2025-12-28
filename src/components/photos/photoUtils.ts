import { base44, type PartyPhoto } from '@/api/base44Client';

/**
 * Recomputes the party cover photo based on the highest net score (likes - dislikes).
 * Ties are broken by newest photo (most recent created_date).
 */
export async function recomputePartyCoverPhoto(partyId: string): Promise<void> {
  try {
    // Get all approved photos for this party
    const photos = await base44.entities.PartyPhoto.filter(
      { party_id: partyId, moderation_status: 'approved' },
      '-created_date'
    );

    if (photos.length === 0) {
      return; // Don't change cover if no photos
    }

    // Find photo with highest net score (likes - dislikes)
    let bestPhoto: PartyPhoto = photos[0];
    let bestScore = (bestPhoto.likes || 0) - (bestPhoto.dislikes || 0);

    for (const photo of photos) {
      const netScore = (photo.likes || 0) - (photo.dislikes || 0);
      // Higher score wins, or if tie, newer photo wins (photos are already sorted by -created_date)
      if (netScore > bestScore) {
        bestScore = netScore;
        bestPhoto = photo;
      }
    }

    // Update party cover photo
    await base44.entities.Party.update(partyId, {
      display_photo_url: bestPhoto.url,
    });
  } catch (error) {
    console.error('Failed to recompute party cover photo:', error);
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
