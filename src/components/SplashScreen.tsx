import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import touseLogo from '@/assets/touse-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'expand' | 'done'>('logo');

  useEffect(() => {
    // Logo appears and pulses
    const expandTimer = setTimeout(() => setPhase('expand'), 1200);
    // Fade out
    const doneTimer = setTimeout(() => {
      setPhase('done');
      setTimeout(onComplete, 400);
    }, 1800);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Radial glow effect */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'expand' ? 0.6 : 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-[400px] h-[400px] rounded-full bg-primary/20 blur-3xl" />
          </motion.div>

          {/* Logo container */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase === 'expand' ? 1.1 : 1,
              opacity: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              duration: 0.6,
            }}
          >
            {/* Rotating ring */}
            <motion.div
              className="absolute w-32 h-32 rounded-full border-2 border-primary/30"
              initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
              animate={{
                scale: phase === 'expand' ? 1.5 : 1.2,
                opacity: phase === 'expand' ? 0 : 0.5,
                rotate: 360,
              }}
              transition={{
                scale: { duration: 0.5 },
                opacity: { duration: 0.3 },
                rotate: { duration: 2, ease: 'linear', repeat: Infinity },
              }}
            />

            {/* Logo */}
            <motion.img
              src={touseLogo}
              alt="Touse"
              className="w-24 h-24 rounded-2xl shadow-2xl relative z-10"
              initial={{ rotate: -10 }}
              animate={{
                rotate: 0,
                scale: phase === 'expand' ? [1, 1.15, 40] : 1,
              }}
              transition={{
                rotate: { type: 'spring', stiffness: 200, damping: 15 },
                scale: {
                  duration: 0.6,
                  times: [0, 0.3, 1],
                  ease: 'easeInOut',
                },
              }}
            />

            {/* App name */}
            <motion.h1
              className="mt-6 text-2xl font-bold text-foreground tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: phase === 'expand' ? 0 : 1,
                y: 0,
              }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              touse
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="mt-1 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{
                opacity: phase === 'expand' ? 0 : 1,
              }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              rate the scene
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
