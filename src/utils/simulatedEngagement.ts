// Simulated engagement utilities for perceived activity
// This adds "bot" votes and engagement to make the app feel more active

/**
 * Generate simulated upvotes/downvotes for a post based on its age and content
 */
export function getSimulatedPostVotes(postId: string, createdAt: string, text: string): { upvotes: number; downvotes: number } {
  // Create a deterministic seed from the post ID
  let seed = 0;
  for (let i = 0; i < postId.length; i++) {
    seed = ((seed << 5) - seed) + postId.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }
  
  // Calculate post age in hours
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  
  // Base engagement scales with age (older posts have more votes)
  const ageFactor = Math.min(1, ageHours / 24); // Max out at 24 hours
  
  // Content-based modifiers
  const hasMention = text.includes('@');
  const hasPoll = text.includes('POLL:');
  const hasRanking = text.includes('🏆') || text.toLowerCase().includes('ranking');
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text);
  
  // Calculate base upvotes (5-50 range based on seed)
  const baseUpvotes = 5 + Math.abs(seed % 46);
  
  // Modifiers
  let upvoteMultiplier = 1;
  if (hasPoll) upvoteMultiplier += 0.5;
  if (hasRanking) upvoteMultiplier += 0.3;
  if (hasMention) upvoteMultiplier += 0.2;
  if (hasEmoji) upvoteMultiplier += 0.1;
  
  // Final upvotes scaled by age
  const upvotes = Math.floor(baseUpvotes * upvoteMultiplier * (0.3 + ageFactor * 0.7));
  
  // Downvotes are much less common (roughly 10-20% of upvotes)
  const downvoteRatio = 0.1 + (Math.abs((seed >> 8) % 10) / 100);
  const downvotes = Math.floor(upvotes * downvoteRatio);
  
  return { upvotes, downvotes };
}

/**
 * Get simulated vote counts for the "Where we going" poll
 * Patterns:
 * - Sunday-Wednesday: mostly "stay_in"
 * - Thursday: mostly "devines"
 * - Friday-Saturday: mixed responses
 */
export function getSimulatedMoveVotes(): Record<string, number> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Base vote counts for each option
  const votes: Record<string, number> = {
    'devines': 0,
    'shooters': 0,
    'stay_in': 0,
  };
  
  // Generate some randomness based on current date (same results for same day)
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const random = (offset: number) => {
    const x = Math.sin(dateSeed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  switch (dayOfWeek) {
    case 0: // Sunday - mostly staying in
      votes['stay_in'] = 45 + Math.floor(random(1) * 30);
      votes['devines'] = 5 + Math.floor(random(2) * 10);
      votes['shooters'] = 3 + Math.floor(random(3) * 8);
      break;
    case 1: // Monday - mostly staying in
      votes['stay_in'] = 55 + Math.floor(random(1) * 25);
      votes['devines'] = 4 + Math.floor(random(2) * 8);
      votes['shooters'] = 2 + Math.floor(random(3) * 6);
      break;
    case 2: // Tuesday - mostly staying in
      votes['stay_in'] = 50 + Math.floor(random(1) * 30);
      votes['devines'] = 8 + Math.floor(random(2) * 10);
      votes['shooters'] = 5 + Math.floor(random(3) * 8);
      break;
    case 3: // Wednesday - mostly staying in, but some going out
      votes['stay_in'] = 40 + Math.floor(random(1) * 25);
      votes['devines'] = 12 + Math.floor(random(2) * 12);
      votes['shooters'] = 10 + Math.floor(random(3) * 10);
      break;
    case 4: // Thursday - mostly devines!
      votes['devines'] = 55 + Math.floor(random(1) * 35);
      votes['shooters'] = 20 + Math.floor(random(2) * 15);
      votes['stay_in'] = 8 + Math.floor(random(3) * 10);
      break;
    case 5: // Friday - mixed, slightly favoring going out
      votes['devines'] = 35 + Math.floor(random(1) * 25);
      votes['shooters'] = 30 + Math.floor(random(2) * 25);
      votes['stay_in'] = 15 + Math.floor(random(3) * 15);
      break;
    case 6: // Saturday - mixed, strong going out
      votes['devines'] = 40 + Math.floor(random(1) * 30);
      votes['shooters'] = 35 + Math.floor(random(2) * 25);
      votes['stay_in'] = 10 + Math.floor(random(3) * 12);
      break;
  }
  
  return votes;
}

/**
 * Merge real vote counts with simulated ones
 */
export function mergeVoteCounts(realVotes: Record<string, number>, simulatedVotes: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...simulatedVotes };
  
  for (const [key, count] of Object.entries(realVotes)) {
    merged[key] = (merged[key] || 0) + count;
  }
  
  return merged;
}
