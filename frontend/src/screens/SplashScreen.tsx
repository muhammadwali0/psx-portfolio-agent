import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/store';

export default function SplashScreen() {
  const { splashDone, setSplashDone } = useStore();
  const [phase, setPhase] = useState<'logo' | 'transition' | 'done'>('logo');

  useEffect(() => {
    if (splashDone) return;
    const t1 = setTimeout(() => setPhase('transition'), 2200);
    const t2 = setTimeout(() => {
      setPhase('done');
      setSplashDone();
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [splashDone, setSplashDone]);

  if (splashDone) return null;

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-surface-primary flex items-center justify-center overflow-hidden"
        >
          {/* Deep ambient glow — outer ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.12, scale: 1.3 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 40%, transparent 70%)' }}
          />
          {/* Inner gold core glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
            className="absolute w-[250px] h-[250px] rounded-full blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)' }}
          />
          {/* Subtle profit glow offset */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.06, scale: 1 }}
            transition={{ duration: 2.5, ease: 'easeOut', delay: 0.5 }}
            className="absolute w-[300px] h-[300px] rounded-full bg-gradient-radial from-profit/20 to-transparent blur-2xl translate-y-24"
          />

          {/* Logo container with subtle 3D perspective */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 24, rotateX: 8 }}
            animate={phase === 'transition'
              ? { opacity: 0, scale: 1.08, y: -30, rotateX: 0 }
              : { opacity: 1, scale: 1, y: 0, rotateX: 0 }
            }
            transition={phase === 'transition'
              ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
              : { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
            }
            className="relative z-10 flex flex-col items-center"
            style={{ perspective: '800px' }}
          >
            {/* Icon mark — premium with gold border glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              className="w-20 h-20 rounded-[22px] border flex items-center justify-center mb-7 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(34,197,94,0.06) 100%)',
                borderColor: 'rgba(34, 197, 94, 0.15)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Light sweep across icon */}
              <motion.div
                initial={{ left: '-150%' }}
                animate={{ left: '150%' }}
                transition={{ delay: 1.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 w-[60%] h-full pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.15), transparent)',
                  transform: 'skewX(-15deg)',
                }}
              />

              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                {/* Stylized ascending chart bars — gold gradient */}
                <motion.rect
                  x="4" y="22" width="5" height="10" rx="2"
                  fill="rgba(34,197,94,0.25)"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                />
                <motion.rect
                  x="12" y="16" width="5" height="16" rx="2"
                  fill="rgba(34,197,94,0.45)"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                />
                <motion.rect
                  x="20" y="10" width="5" height="22" rx="2"
                  fill="rgba(34,197,94,0.70)"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.7, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                />
                <motion.rect
                  x="28" y="4" width="5" height="28" rx="2"
                  fill="#22C55E"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.8, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                />
              </svg>
            </motion.div>

            {/* Text — gold gradient on title */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <h1 className="text-xl font-heading font-bold tracking-tight mb-1 gradient-text-gold">
                PSX Portfolio
              </h1>
              <p className="text-[11px] font-medium text-psx-300 tracking-widest uppercase">
                AI Investment Agent
              </p>
            </motion.div>

            {/* Gold-accented loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="mt-10 w-20 h-[2px] rounded-full overflow-hidden"
              style={{ background: 'rgba(34,197,94,0.08)' }}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: 1, ease: 'easeInOut' }}
                className="w-full h-full"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.40), transparent)' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
