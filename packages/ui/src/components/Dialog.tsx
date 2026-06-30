import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cn } from '@zira/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with premium heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, cubicBezier: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#070913]/35 dark:bg-[#060814]/60 backdrop-blur-3xl"
            aria-hidden="true"
          />
          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none" role="dialog" aria-modal="true" aria-label={title}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={cn(
                "w-full max-w-md bg-modal rounded-3xl shadow-neo-out-lg pointer-events-auto overflow-hidden border border-white/20",
                className
              )}
            >
              <div className="flex items-center justify-between px-6.5 py-5 border-b border-black/5 dark:border-white/5">
                <h3 className="text-xl font-bold tracking-tight text-text-primary">{title}</h3>
                <IconButton label="Close" onClick={onClose} className="w-9 h-9 -mr-2 bg-transparent hover:shadow-neo-out-sm border-none">
                  <X className="w-5 h-5 text-text-secondary" />
                </IconButton>
              </div>
              <div className="p-6.5">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};