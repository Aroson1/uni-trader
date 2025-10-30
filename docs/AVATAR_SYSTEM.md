# Avatar System Setup

## Overview
The avatar system automatically generates consistent avatars for users based on their username. It uses a hash function to map each username to one of 28 unique avatar images.

## Directory Structure
Place 28 avatar images in the following location:
```
/public/assets/avatars/
  ├── avatar-1.png
  ├── avatar-2.png
  ├── avatar-3.png
  ├── ...
  └── avatar-28.png
```

## How It Works
1. **Username Hashing**: The `getAvatarNumber()` function converts a username into a consistent number (1-28)
2. **Avatar Assignment**: Each user automatically gets assigned one of the 28 avatars based on their name
3. **Custom Avatar Priority**: If a user uploads a custom avatar or signs in with Google (which provides an avatar), the custom avatar takes precedence

## Usage

### Get User Avatar URL
```typescript
import { getUserAvatar } from '@/lib/avatar-generator';

const avatarUrl = getUserAvatar(username, customAvatarUrl);
// Returns: custom avatar if available, otherwise generated avatar
```

### Get Avatar Number Only
```typescript
import { getAvatarNumber } from '@/lib/avatar-generator';

const avatarNum = getAvatarNumber(username);
// Returns: Number between 1-28
```

### Get Avatar with Fallback
```typescript
import { getAvatarWithFallback } from '@/lib/avatar-generator';

const { src, fallback } = getAvatarWithFallback(username, customAvatarUrl);
// Returns: { src: primary avatar, fallback: generated avatar }
```

## Where It's Implemented
The avatar generator is now used throughout the application:

1. **Profile Page** (`/app/profile/[user]/profile-content.tsx`)
   - Large profile avatar (176x176px)
   
2. **Header** (`/components/layout/header.tsx`)
   - User dropdown avatar (32x32px)
   
3. **NFT Cards** (`/components/nft/nft-card.tsx`)
   - Creator and owner avatars (24x24px)

4. **Chat** (To be implemented)
   - Message sender avatars

5. **Comments/Reviews** (To be implemented)
   - User comment avatars

## Avatar Image Requirements
- Format: PNG (recommended) or JPG
- Size: 512x512px minimum (will be scaled down)
- Naming: `avatar-1.png` through `avatar-28.png`
- Style: Should be consistent across all 28 images
- Background: Transparent or solid color

## Example Avatar Sources
You can source avatars from:
- **Dicebear**: https://www.dicebear.com/
- **Boring Avatars**: https://boringavatars.com/
- **Avatar Generator**: https://ui-avatars.com/
- Custom designed avatars
- Icon packs with character illustrations

## Testing
The same username will always get the same avatar number, ensuring consistency across the application.

Test examples:
- "Alice" → Avatar 15
- "Bob" → Avatar 3
- "Charlie" → Avatar 22

(Actual numbers will vary based on the hash function)
