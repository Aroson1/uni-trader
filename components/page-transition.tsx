'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import Image from 'next/image';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1400); // Total transition duration

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {/* Clean Blur Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          >
            {/* Smooth Blur Background with Fade */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
              }}
              initial={{ 
                opacity: 0,
                backdropFilter: 'blur(0px)',
              }}
              animate={{ 
                opacity: 1,
                backdropFilter: 'blur(20px)',
              }}
              exit={{ 
                opacity: 0,
                backdropFilter: 'blur(0px)',
              }}
              transition={{ 
                opacity: { duration: 0.4, ease: "easeInOut" },
                backdropFilter: { duration: 0.5, ease: "easeInOut" },
              }}
            />

            {/* Pulsating Logo */}
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.8],
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.2, 0.8, 1],
                ease: "easeInOut",
              }}
            >
              {/* Logo with Pulsate Effect */}
              <motion.div
                className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"
                animate={{ 
                  scale: [1, 1.15, 1, 1.15, 1],
                }}
                transition={{
                  duration: 1.2,
                  times: [0, 0.25, 0.5, 0.75, 1],
                  ease: "easeInOut",
                  repeat: 0,
                }}
              >
                <Image
                  src="/logo.svg"
                  alt="Unitrader Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: 0.7,
          duration: 0.5,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
