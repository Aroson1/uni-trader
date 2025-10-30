'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { getUserAvatar } from '@/lib/avatar-generator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Wallet,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  MessageSquare,
  Bell,
  Twitter,
  Linkedin,
  Github,
  Instagram,
} from 'lucide-react';
import Image from 'next/image';

export function CornerNavbar() {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
  const displayAvatar = profile?.avatar_url || null;

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: Github, href: 'https://github.com', label: 'GitHub' },
  ];

  const menuLinks = [
    { title: 'home', href: '/' },
    { title: 'explore', href: '/explore' },
    { title: 'sell', href: '/create' },
    // { title: 'rankings', href: '/rankings' },
    { title: 'chat', href: '/chat' },
  ];

  const toggleNavigation = () => {
    setIsOpen(!isOpen);
  };

  const closeNavigation = () => {
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    closeNavigation();
  };

  return (
    <>
      {/* Profile Chip - Far Left side when closed */}
      {user && !isOpen && (
        <div className="fixed left-4 top-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-2.5 h-[52px] rounded-full glass hover:bg-muted transition-all border border-border/50">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getUserAvatar(displayName, displayAvatar)} />
                  <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wallet" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-red-600">
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation Background */}
      <div
        className={`fixed z-40 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 shadow-lg shadow-violet-800/20 transition-all duration-500 ease-out ${
          isOpen
            ? 'w-[calc(100%-32px)] h-[calc(100vh-32px)]'
            : 'w-[52px] h-[52px]'
        }`}
        style={{ top: '16px', right: '16px' }}
      />

      {/* Hamburger Button - Smaller to match profile chip */}
      <button
        onClick={toggleNavigation}
        className={`group fixed right-4 top-4 z-50 h-[52px] w-[52px] bg-white/0 transition-all hover:bg-white/20 ${
          isOpen ? 'rounded-bl-xl rounded-tr-xl' : 'rounded-xl'
        }`}
        aria-label="Toggle navigation"
      >
        {/* Top line */}
        <span
          className={`absolute block h-0.5 w-7 bg-white transition-all duration-300 ${
            isOpen
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45'
              : 'top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        />
        {/* Middle line */}
        <span
          className={`absolute block h-0.5 w-7 bg-white transition-all duration-300 ${
            isOpen
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        />
        {/* Bottom line */}
        <span
          className={`absolute block h-0.5 w-4 bg-white transition-all duration-300 ${
            isOpen
              ? 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45'
              : 'bottom-[35%] left-[calc(50%+6px)] -translate-x-1/2 translate-y-1/2'
          }`}
        />
      </button>

      {/* Navigation Content */}
      <div
        className={`fixed right-4 top-4 z-40 h-[calc(100vh-32px)] w-[calc(100%-32px)] overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center justify-center h-20 w-20 rounded-br-xl rounded-tl-xl bg-white transition-all duration-500 hover:bg-violet-50 ${
            isOpen ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 -translate-y-3'
          }`}
          onClick={closeNavigation}
        >
          <div className="relative w-12 h-12">
            <Image
              src="/logo.svg"
              alt="Unitrader"
              fill
              className="object-contain"
            />
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-4 p-12 pl-4 md:pl-20">
          {menuLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-5xl font-semibold text-violet-400 transition-all duration-200 hover:text-violet-50 md:text-7xl ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}
              style={{
                transitionDelay: isOpen ? `${750 + index * 125}ms` : '0ms',
              }}
              onClick={closeNavigation}
            >
              {link.title}.
            </Link>
          ))}
        </nav>

        {/* Social Links - Bottom Left */}
        <div className="absolute bottom-6 left-6 flex gap-4 md:flex-col">
          {socialLinks.map((social, index) => {
            const Icon = social.icon;
            return (
              <Link
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xl text-white transition-all duration-200 hover:text-violet-300 hover:scale-110 ${
                  isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}
                style={{
                  transitionDelay: isOpen ? `${1000 + index * 125}ms` : '0ms',
                }}
                aria-label={social.label}
              >
                <Icon className="w-6 h-6" />
              </Link>
            );
          })}
        </div>

        {/* User Actions & Theme Toggle - Bottom Right */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end">
          {/* Theme Toggle & Search - Horizontal Row */}
          <div className="flex gap-3">
            {/* Search */}
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                closeNavigation();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-500 ${
                isOpen ? 'opacity-100 translate-y-0 delay-[1000ms]' : 'opacity-0 translate-y-2'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="hidden md:inline">Search</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-500 ${
                isOpen ? 'opacity-100 translate-y-0 delay-[1125ms]' : 'opacity-0 translate-y-2'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5" />
                  <span className="hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>
          </div>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex flex-col gap-3 items-end">
              {/* Profile Dropdown in Open Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-3 rounded-full bg-white px-4 py-3 text-violet-600 transition-all duration-500 hover:bg-violet-50 ${
                      isOpen ? 'opacity-100 translate-y-0 delay-[1250ms]' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getUserAvatar(displayName, displayAvatar)} />
                      <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium hidden md:block">{displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-2" onClick={closeNavigation}>
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wallet" className="flex items-center gap-2" onClick={closeNavigation}>
                      <Wallet className="w-4 h-4" />
                      Wallet
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2" onClick={closeNavigation}>
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/chat" className="flex items-center gap-2" onClick={closeNavigation}>
                      <MessageSquare className="w-4 h-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      signOut();
                      closeNavigation();
                    }}
                    className="flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={`flex items-center gap-2 rounded-full bg-white px-6 py-3 text-violet-600 font-semibold transition-all duration-500 hover:bg-violet-50 ${
                isOpen ? 'opacity-100 translate-y-0 delay-[1250ms]' : 'opacity-0 translate-y-2'
              }`}
              onClick={closeNavigation}
            >
              <span>Get Started</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={closeNavigation} />
      )}

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center pt-20">
          <div className="w-full max-w-2xl px-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search NFTs, collections, or creators..."
                className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-primary bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
