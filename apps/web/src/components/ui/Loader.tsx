import React from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';

export const Loader: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B0F1A] overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        {/* Logo container with float and soft glow pulse */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{
            opacity: 1,
            y: [0, -8, 0],
            scale: 1,
            filter: [
              'drop-shadow(0px 4px 12px rgba(34, 197, 94, 0.15))',
              'drop-shadow(0px 8px 24px rgba(14, 165, 233, 0.25))',
              'drop-shadow(0px 4px 12px rgba(34, 197, 94, 0.15))'
            ],
          }}
          transition={{
            opacity: { duration: 0.6, ease: 'easeOut' },
            scale: { duration: 0.6, ease: 'easeOut' },
            y: {
              repeat: Infinity,
              duration: 2.0,
              ease: 'easeInOut',
            },
            filter: {
              repeat: Infinity,
              duration: 2.0,
              ease: 'easeInOut',
            }
          }}
          className="gpu-accelerated"
          style={{ transform: 'translateZ(0)' }}
        >
          <BrandLogo size="2xl" theme="dark" />
        </motion.div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            repeat: Infinity,
            duration: 2.0,
            ease: 'easeInOut',
          }}
          className="text-sm font-medium tracking-wide text-primary-300 select-none mt-2"
        >
          Loading Zira Chat...
        </motion.span>
      </div>
    </div>
  );
};