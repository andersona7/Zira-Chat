import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AuthLayout = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#070913]/10 dark:bg-[#060814]/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Theme toggle */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 w-11 h-11 rounded-2xl glass-floating flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-glass-bg-floating/60 border border-glass-border-floating transition-all shadow-glass-floating"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </motion.button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3.5 mb-10">
          <BrandLogo size="xl" className="shadow-glass-elevated rounded-[30%]" />
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-text-primary bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-brand-indigo to-brand-cyan">
            Zira Chat
          </h1>
          <p className="text-sm font-medium text-text-muted tracking-wide uppercase opacity-75">
            Decentralized Premium Messaging
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-modal py-10 px-8 shadow-glass-modal sm:rounded-3xl sm:px-12 border border-glass-border-modal"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Premium Aurora Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-indigo/10 via-background to-brand-cyan/5 dark:from-brand-indigo/15 dark:via-background dark:to-brand-cyan/10" />
        <div className="absolute top-[-20%] left-[-15%] w-[80vw] h-[80vw] rounded-full bg-brand-indigo/20 dark:bg-brand-indigo/15 blur-[120px] animate-aurora-1" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[75vw] h-[75vw] rounded-full bg-brand-cyan/18 dark:bg-brand-cyan/12 blur-[100px] animate-aurora-2" />
        <div className="absolute top-[40%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-brand-blue/10 dark:bg-brand-blue/8 blur-[110px] animate-aurora-3" />
      </div>

      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: 'var(--color-toast-bg)', 
            color: 'var(--color-toast-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            fontSize: '14px',
            padding: '12px 18px',
            backdropFilter: 'blur(16px)',
          } 
        }} 
      />
    </div>
  );
};