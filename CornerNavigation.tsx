import React, { useState } from 'react';
import Link from 'next/link';

interface MenuLink {
  title: string;
  href: string;
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

interface CornerNavigationProps {
  menuLinks?: MenuLink[];
  socialLinks?: SocialLink[];
  onSignupClick?: () => void;
  signupHref?: string;
  className?: string;
}

const CornerNavigation: React.FC<CornerNavigationProps> = ({
  menuLinks = [
    { title: 'Home', href: '/' },
    { title: 'Features', href: '/features' },
    { title: 'Blog', href: '/blog' },
    { title: 'Careers', href: '/careers' }
  ],
  socialLinks = [
    { 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
        </svg>
      ), 
      href: 'https://twitter.com', 
      label: 'Twitter' 
    },
    { 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
        </svg>
      ), 
      href: 'https://twitter.com', 
      label: 'Twitter' 
    },
    { 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ), 
      href: 'https://linkedin.com', 
      label: 'LinkedIn' 
    },
    { 
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.175 1.219-5.175s-.311-.623-.311-1.544c0-1.445.839-2.525 1.883-2.525.888 0 1.317.666 1.317 1.466 0 .893-.568 2.229-.861 3.467-.245 1.04.522 1.887 1.549 1.887 1.857 0 3.285-1.958 3.285-4.789 0-2.503-1.799-4.253-4.37-4.253-2.977 0-4.727 2.234-4.727 4.546 0 .901.347 1.869.78 2.393.086.099.098.186.072.287-.079.331-.256 1.011-.292 1.152-.047.181-.153.22-.353.133-1.249-.581-2.03-2.407-2.03-3.874 0-3.298 2.397-6.327 6.914-6.327 3.63 0 6.45 2.58 6.45 6.031 0 3.598-2.267 6.495-5.41 6.495-1.057 0-2.053-.549-2.392-1.274 0 0-.523 1.992-.65 2.479-.235.9-.870 2.031-1.295 2.719C8.657 23.761 10.25 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
        </svg>
      ), 
      href: 'https://pinterest.com', 
      label: 'Pinterest' 
    }
  ],
  onSignupClick,
  signupHref = '/signup',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleNavigation = () => {
    setIsOpen(!isOpen);
  };

  const closeNavigation = () => {
    setIsOpen(false);
  };

  const handleSignupClick = () => {
    if (onSignupClick) {
      onSignupClick();
    }
    closeNavigation();
  };

  return (
    <div className={`corner-navigation ${className}`}>
      {/* Navigation Background */}
      <div 
        className={`fixed z-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 shadow-lg shadow-violet-800/20 transition-all duration-600 ease-out ${
          isOpen 
            ? 'w-[calc(100%-32px)] h-[calc(100vh-32px)]' 
            : 'w-20 h-20'
        }`}
        style={{ top: '16px', right: '16px' }}
      />

      {/* Hamburger Button */}
      <button
        onClick={toggleNavigation}
        className={`group fixed right-4 top-4 z-50 h-20 w-20 bg-white/0 transition-all hover:bg-white/20 ${
          isOpen ? 'rounded-bl-xl rounded-tr-xl' : 'rounded-xl'
        }`}
        aria-label="Toggle navigation"
      >
        {/* Top line */}
        <span
          className={`absolute block h-1 w-10 bg-white transition-all duration-300 ${
            isOpen 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45' 
              : 'top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        />
        {/* Middle line */}
        <span
          className={`absolute block h-1 w-10 bg-white transition-all duration-300 ${
            isOpen 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45' 
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        />
        {/* Bottom line */}
        <span
          className={`absolute block h-1 w-5 bg-white transition-all duration-300 ${
            isOpen 
              ? 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45' 
              : 'bottom-[35%] left-[calc(50%+10px)] -translate-x-1/2 translate-y-1/2'
          }`}
        />
      </button>

      {/* Center Text */}
      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-lg text-violet-500">
        <span>Open me</span>
        <svg 
          stroke="currentColor" 
          fill="none" 
          strokeWidth="2" 
          viewBox="0 0 24 24" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          height="1em" 
          width="1em"
        >
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      </span>

      {/* Navigation Content */}
      <div 
        className={`fixed right-4 top-4 z-40 h-[calc(100vh-32px)] w-[calc(100%-32px)] overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`grid h-20 w-20 place-content-center rounded-br-xl rounded-tl-xl bg-white transition-all duration-500 hover:bg-violet-50 ${
            isOpen ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 -translate-y-3'
          }`}
          onClick={closeNavigation}
        >
          <svg 
            width="50" 
            height="39" 
            viewBox="0 0 50 39" 
            fill="none" 
            className="fill-violet-600"
          >
            <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z"/>
            <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z"/>
          </svg>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-4 p-12 pl-4 md:pl-20">
          {menuLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-5xl font-semibold text-violet-400 transition-all duration-500 hover:text-violet-50 md:text-7xl ${
                isOpen 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-2'
              }`}
              style={{
                transitionDelay: isOpen ? `${750 + index * 125}ms` : '0ms'
              }}
              onClick={closeNavigation}
            >
              {link.title}.
            </Link>
          ))}
        </nav>

        {/* Social Links */}
        <div className="absolute bottom-6 left-6 flex gap-4 md:flex-col">
          {socialLinks.map((social, index) => (
            <Link
              key={social.href}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xl text-white transition-all duration-500 hover:text-violet-300 ${
                isOpen 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-2'
              }`}
              style={{
                transitionDelay: isOpen ? `${1000 + index * 125}ms` : '0ms'
              }}
              aria-label={social.label}
            >
              {social.icon}
            </Link>
          ))}
        </div>

        {/* Signup Button */}
        {signupHref && !onSignupClick ? (
          <Link
            href={signupHref}
            className={`absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-violet-700 px-3 py-3 text-4xl uppercase text-violet-200 transition-all duration-500 hover:bg-white hover:text-violet-600 md:bottom-4 md:right-4 md:px-6 md:text-2xl ${
              isOpen 
                ? 'opacity-100 translate-y-0 delay-[1125ms]' 
                : 'opacity-0 translate-y-2'
            }`}
            onClick={closeNavigation}
          >
            <span className="hidden md:block">Sign Up</span>
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 8l4 4m0 0l-4 4m4-4H3" 
              />
            </svg>
          </Link>
        ) : (
          <button
            onClick={handleSignupClick}
            className={`absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-violet-700 px-3 py-3 text-4xl uppercase text-violet-200 transition-all duration-500 hover:bg-white hover:text-violet-600 md:bottom-4 md:right-4 md:px-6 md:text-2xl ${
              isOpen 
                ? 'opacity-100 translate-y-0 delay-[1125ms]' 
                : 'opacity-0 translate-y-2'
            }`}
          >
            <span className="hidden md:block">Sign Up</span>
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 8l4 4m0 0l-4 4m4-4H3" 
              />
            </svg>
          </button>
        )}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={closeNavigation}
        />
      )}
    </div>
  );
};

export default CornerNavigation;