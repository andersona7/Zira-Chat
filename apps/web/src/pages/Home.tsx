import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { CallScreen } from '@/components/call/CallScreen';
import { Lock } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useChatAutoLock } from '@/hooks/useChatAutoLock';
import { BrandLogo } from '@/components/ui/BrandLogo';

import { selectActiveChat } from '@/store/selectors';

export const Home = () => {
  useChatAutoLock();
  const activeChat = useSelector(selectActiveChat);
  const callState = useSelector((state: RootState) => state.call);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // On mobile, selecting a chat hides the sidebar
  const handleChatSelected = () => {
    setIsMobileSidebarOpen(false);
  };

  // On mobile, going back shows the sidebar
  const handleBackToSidebar = () => {
    setIsMobileSidebarOpen(true);
  };

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden relative font-sans p-3 md:p-4 gap-3 md:gap-4">
      {/* Soft Ambient Light Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/10 dark:bg-secondary/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-primary/10 dark:bg-primary/15 blur-[90px]" />
      </div>

      {/* Sidebar: always visible on desktop, toggled on mobile */}
      <div className={`
        ${isMobileSidebarOpen ? 'flex' : 'hidden'} 
        md:flex
        ${isSidebarCollapsed ? 'w-[72px]' : 'w-full md:w-[300px] xl:w-[340px]'}
        h-full shrink-0 transition-all duration-200 z-10 neo-out-md rounded-2xl overflow-hidden
      `}>
        <Sidebar 
          onChatSelected={handleChatSelected} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main area */}
      <main className={`
        ${!isMobileSidebarOpen ? 'flex' : 'hidden'} 
        md:flex 
        flex-1 flex-col relative z-10 neo-out-md rounded-2xl overflow-hidden
      `}>
        {activeChat ? (
          <ChatArea onBack={handleBackToSidebar} />
        ) : (
          <div className="hidden md:flex absolute inset-0 flex-col items-center justify-center bg-transparent">
            <div className="max-w-md text-center space-y-6">
              {/* Logo */}
              <div className="flex justify-center">
                <BrandLogo size="2xl" />
              </div>
              <h1 className="text-4xl font-display font-light text-text-primary tracking-tight">Zira Chat</h1>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
                Select a chat to start messaging.
                <br />
                Experience the next evolution of desktop messaging.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-text-muted bg-card px-4 py-2 rounded-full mt-8 shadow-neo-out-sm border border-white/20">
                <Lock className="w-3.5 h-3.5 text-secondary" />
                End-to-end encrypted messaging environment
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Call Overlay Component */}
      {(callState.isActive || callState.isIncoming || callState.isOutgoing) && (
        <CallScreen />
      )}

      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: 'var(--color-toast-bg)', 
            color: 'var(--color-toast-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            fontSize: '14px',
            backdropFilter: 'blur(16px)',
          } 
        }} 
      />
    </div>
  );
};