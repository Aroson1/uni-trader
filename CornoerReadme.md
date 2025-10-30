# Corner Navigation Component

A beautiful, animated corner navigation component for Next.js projects with TypeScript support.

## Installation

1. Copy the `CornerNavigation.tsx` component to your components directory
2. Make sure you have the required dependencies:

```bash
npm install react @types/react next
```

3. Ensure your project has Tailwind CSS configured with the violet color palette

## Usage

### Basic Usage

```tsx
import CornerNavigation from '@/components/CornerNavigation';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <CornerNavigation />
      {children}
    </div>
  );
}
```

### Custom Menu Links

```tsx
const customMenuLinks = [
  { title: 'Home', href: '/' },
  { title: 'About', href: '/about' },
  { title: 'Services', href: '/services' },
  { title: 'Contact', href: '/contact' }
];

<CornerNavigation 
  menuLinks={customMenuLinks}
  signupHref="/register"
/>
```

### With Custom Signup Handler

```tsx
const handleSignup = () => {
  // Custom signup logic
  router.push('/signup');
  // or open modal, etc.
};

<CornerNavigation 
  onSignupClick={handleSignup}
/>
```

### With Custom Social Links

```tsx
const customSocialLinks = [
  {
    icon: <TwitterIcon className="w-6 h-6" />,
    href: 'https://twitter.com/yourhandle',
    label: 'Twitter'
  },
  {
    icon: <GitHubIcon className="w-6 h-6" />,
    href: 'https://github.com/yourusername',
    label: 'GitHub'
  }
];

<CornerNavigation 
  socialLinks={customSocialLinks}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menuLinks` | `MenuLink[]` | Default menu | Array of navigation links |
| `socialLinks` | `SocialLink[]` | Default social links | Array of social media links |
| `onSignupClick` | `() => void` | `undefined` | Custom signup handler (overrides `signupHref`) |
| `signupHref` | `string` | `'/signup'` | Signup button link (used if `onSignupClick` not provided) |
| `className` | `string` | `''` | Additional CSS classes for the container |

## Types

```tsx
interface MenuLink {
  title: string;
  href: string;
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}
```

## Required Tailwind Classes

Make sure your Tailwind configuration includes the violet color palette and these utilities:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: {
          // Tailwind's default violet palette
        }
      },
      transitionDuration: {
        '600': '600ms',
      }
    },
  },
  plugins: [],
}
```

## Features

- 🎨 Beautiful violet gradient design
- ⚡ Smooth animations with staggered timing
- 📱 Fully responsive (mobile & desktop)
- ♿ Accessibility features (ARIA labels, keyboard support)
- 🔗 Next.js Link integration for optimal performance
- 🎯 TypeScript support with proper types
- 🎮 Customizable menu items and social links
- 🔄 Flexible signup handling (link or custom handler)

## Styling Notes

- Uses Tailwind CSS utility classes
- Matches the original Framer Motion animations
- Fully responsive with mobile-specific behaviors
- Hover states and focus management included
- Z-index layers properly managed for overlay behavior

## Browser Support

Works in all modern browsers that support CSS Grid, Flexbox, and CSS transforms.