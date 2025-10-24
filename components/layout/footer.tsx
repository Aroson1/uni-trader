import Link from 'next/link';
import { Twitter, Send, Youtube, Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Marketplace: [
      { name: 'Explore', href: '/explore' },
      { name: 'Activity', href: '/activity' },
      { name: 'Top Sellers', href: '/top-sellers' },
      { name: 'Categories', href: '/categories' },
    ],
    Community: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Help Center', href: '/support' },
      { name: 'Community Guidelines', href: '/guidelines' },
    ],
    Resources: [
      { name: 'Docs', href: '/docs' },
      { name: 'API', href: '/api' },
      { name: 'Partners', href: '/partners' },
      { name: 'Careers', href: '/careers' },
    ],
    Company: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Contact', href: '/contact' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Send, href: '#', label: 'Telegram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
    { icon: Github, href: '#', label: 'GitHub' },
  ];

  return (
    <footer className="glass border-t border-border/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                <span className="text-white font-bold text-xl">U</span>
              </div>
              <span className="text-xl font-bold">Unitrader</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              The next-generation Item marketplace for digital art, collectibles, and unique digital assets.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="glass rounded-full p-2 hover:bg-primary/10 hover:scale-110 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Unitrader. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Built with Next.js & Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
