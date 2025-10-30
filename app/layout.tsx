import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Unitrader - Next-Generation Item Marketplace',
  description: 'Discover, collect, and trade unique digital assets on Unitrader - the modern Item marketplace for digital art, collectibles, and more.',
  keywords: ['Item', 'marketplace', 'digital art', 'collectibles', 'blockchain', 'crypto'],
  authors: [{ name: 'Unitrader' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
