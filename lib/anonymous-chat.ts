/**
 * Anonymous Chat Utility Functions
 *
 * This module provides utilities for generating consistent anonymous names
 * for users in chat conversations to maintain privacy.
 */

/**
 * Generates an anonymous name based on user ID
 * Uses a simple hash function to ensure consistent naming
 * @param userId - The user's ID
 * @returns Anonymous name like "Anonymous1", "Anonymous2", etc.
 */
export function getAnonymousName(userId: string): string {
  // Simple hash function to convert userId to a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive number and get modulo for consistent numbering
  const anonymousNumber = (Math.abs(hash) % 1000) + 1;
  return `Anonymous${anonymousNumber}`;
}

/**
 * Gets anonymous name for display in chat contexts
 * @param userId - The user's ID
 * @param currentUserId - The current user's ID (to show "You" for current user)
 * @returns Anonymous name or "You" for current user
 */
export function getDisplayName(userId: string, currentUserId?: string): string {
  if (currentUserId && userId === currentUserId) {
    return "You";
  }
  return getAnonymousName(userId);
}

/**
 * Gets anonymous name for a user profile object
 * @param user - User profile object with id and name
 * @param currentUserId - The current user's ID
 * @returns Anonymous name or "You" for current user
 */
export function getAnonymousDisplayName(
  user: { id: string; name: string },
  currentUserId?: string
): string {
  if (currentUserId && user.id === currentUserId) {
    return "You";
  }
  return getAnonymousName(user.id);
}
