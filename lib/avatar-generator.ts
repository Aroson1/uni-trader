/**
 * Avatar Generator Utility
 * Generates a consistent avatar number (1-28) based on username
 */

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get avatar number (1-28) based on username
 * @param username - The user's name/username
 * @returns A number between 1 and 28
 */
export function getAvatarNumber(username: string): number {
  if (!username) return 1; // Default to avatar 1 if no username
  
  const hash = hashString(username.toLowerCase());
  return (hash % 28) + 1; // Returns 1-28
}

/**
 * Get avatar URL for a user
 * @param username - The user's name/username
 * @param customAvatar - Optional custom avatar URL (from Google, upload, etc.)
 * @returns The avatar URL to use
 */
export function getUserAvatar(username: string, customAvatar?: string | null): string {
  
  
  // Otherwise, generate avatar based on username
  const avatarNumber = getAvatarNumber(username);
  const paddedNumber = avatarNumber.toString().padStart(2, '0'); // 1 -> "01", 28 -> "28"
  console.log(`Generated Avatar: ${username} → /avatars/avt-${paddedNumber}.jpg`);

  return `/avatars/avt-${paddedNumber}.jpg`;
}

/**
 * Get avatar URL with fallback for Image component
 * @param username - The user's name/username  
 * @param customAvatar - Optional custom avatar URL
 * @returns Object with src and fallback
 */
export function getAvatarWithFallback(username: string, customAvatar?: string | null) {
  const avatarNumber = getAvatarNumber(username);
  const paddedNumber = avatarNumber.toString().padStart(2, '0');
  const generatedAvatar = `/avatars/avt-${paddedNumber}.jpg`;

  
  return {
    src: customAvatar || generatedAvatar,
    fallback: generatedAvatar,
  };
}
