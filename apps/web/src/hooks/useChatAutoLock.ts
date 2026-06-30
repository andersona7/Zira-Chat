import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useExitLockedChat } from './useExitLockedChat';
import toast from 'react-hot-toast';

export function useChatAutoLock() {
  const unlockedChats = useSelector((state: RootState) => (state.chat as any).unlockedChats || []);
  const exitLockedChat = useExitLockedChat();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (unlockedChats.length === 0) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const timeoutMin = parseInt(localStorage.getItem('chat_lock_timeout') || '5', 10);
      const timeoutMs = timeoutMin * 60 * 1000;

      timeoutRef.current = setTimeout(() => {
        const chatsToLock = [...unlockedChats];
        chatsToLock.forEach((chatId: string) => {
          exitLockedChat(chatId);
        });
        toast('Chats locked due to inactivity', { icon: '🔒' });
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));

    const handleStorageChange = () => {
      resetTimer();
    };
    window.addEventListener('storage', handleStorageChange);

    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [unlockedChats, exitLockedChat]);
}
