import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Send, Youtube, Github, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Marketplace: [
      { name: 'Explore', href: '/explore' },
      { name: 'Activity', href: '/activity' },
      { name: 'Top Sellers', href: '/top-sellers' },
      { name: 'Categories', href: '/categories' },
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
    <footer className="relative mt-20 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-background to-pink-500/5" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
      
      {/* Border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-2 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-110">
                <div className="relative w-full h-full">
                  <Image
                    src="/logo.svg"
                    alt="Unitrader"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                Unitrader
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
              The next-generation Item marketplace for digital art, collectibles, and unique digital assets. Join our community and start your journey today.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="group relative"
                  aria-label={social.label}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative glass rounded-xl p-2.5 hover:bg-gradient-to-br hover:from-violet-500/10 hover:to-pink-500/10 border border-border/50 hover:border-violet-500/50 transition-all duration-200">
                    <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">
                  {category}
                </h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 inline-block transition-all duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {/* Newsletter */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">
                Newsletter
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Stay updated with our latest drops and news.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200 hover:scale-105">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/30">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Unitrader. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Built with</span>
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
              <span>Blood, Sweat and Tears</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
