import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Avatar, IconButton } from '@zira/ui';
import { format } from 'date-fns';
import { useMarkStatusViewedMutation } from '@/store/api/statusApi';
import type { UserStatusGroup } from '@zira/types';
import { useContactNames } from '@/hooks/useContactNames';
import { useSecureMedia } from '@/hooks/useSecureMedia';

interface StatusViewerProps {
  groups: UserStatusGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
}

export const StatusViewer: React.FC<StatusViewerProps> = ({ groups, initialGroupIndex, currentUserId, onClose }) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const [markViewed] = useMarkStatusViewedMutation();
  const { getContactName } = useContactNames();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressStartTimeRef = useRef<number>(0);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    pressStartTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent, action: 'prev' | 'next') => {
    // Prevent double-triggering between touch and mouse events
    if (e.cancelable) {
      e.preventDefault();
    }
    setIsPaused(false);
    const pressDuration = Date.now() - pressStartTimeRef.current;
    
    // If it was held for less than 250ms, navigate. Otherwise, just resume.
    if (pressDuration < 250) {
      if (action === 'prev') {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const currentGroup = groups[groupIndex];
  const currentStatus = currentGroup?.statuses[statusIndex];

  const statusMediaSrc = currentStatus?.media ? (currentStatus.media.mediaId || currentStatus.media.url) : undefined;
  const { secureUrl: statusMediaUrl } = useSecureMedia(statusMediaSrc);

  // Pause/play video based on isPaused state
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused]);

  // Handle viewing
  useEffect(() => {
    if (currentStatus && !currentStatus.viewers.includes(currentUserId) && currentGroup.user.id !== currentUserId) {
      markViewed(currentStatus.id);
    }
  }, [currentStatus, currentUserId, currentGroup, markViewed]);

  // Progress Bar Timer (5 seconds per status)
  useEffect(() => {
    if (isPaused || currentStatus?.type === 'VIDEO') return;

    const DURATION = 5000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return p + step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [groupIndex, statusIndex, isPaused, currentStatus]);

  const handleNext = () => {
    if (statusIndex < currentGroup.statuses.length - 1) {
      setStatusIndex(s => s + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStatusIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (statusIndex > 0) {
      setStatusIndex(s => s - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStatusIndex(prevGroup.statuses.length - 1);
      setProgress(0);
    }
  };

  if (!currentGroup || !currentStatus) return null;
  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <div 
          className="relative w-full max-w-md h-full sm:h-[85vh] sm:rounded-2xl overflow-hidden bg-surface flex flex-col"
        >
          {/* Top Progress Bars */}
          <div className="absolute top-0 left-0 w-full px-2 pt-3 flex gap-1 z-20">
            {currentGroup.statuses.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75"
                  style={{ 
                    width: idx < statusIndex ? '100%' : idx === statusIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 w-full px-4 flex items-center justify-between z-20 text-white drop-shadow-md">
            <div className="flex items-center gap-3">
              <Avatar src={currentGroup.user.avatarUrl} fallback={getContactName(currentGroup.user.id || (currentGroup.user as any)._id, currentGroup.user)} size="md" />
              <div>
                <h3 className="font-medium text-sm leading-tight">{currentGroup.user.id === currentUserId ? 'My Status' : getContactName(currentGroup.user.id || (currentGroup.user as any)._id, currentGroup.user)}</h3>
                <span className="text-xs opacity-80">{format(new Date(currentStatus.createdAt), 'hh:mm a')}</span>
              </div>
            </div>
            <IconButton label="Close" onClick={onClose} className="text-white hover:bg-white/20 bg-transparent border-none">
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Content */}
          <div className="w-full h-full flex flex-col">
            {currentStatus.type === 'TEXT' && (
              <div 
                className="flex-1 flex items-center justify-center p-8 text-center"
                style={{ backgroundColor: currentStatus.backgroundColor }}
              >
                <p className="text-white text-3xl font-display leading-tight">{currentStatus.content}</p>
              </div>
            )}
            
            {currentStatus.type === 'IMAGE' && currentStatus.media && (
              <div className="flex-1 flex items-center justify-center bg-black relative">
                <img src={statusMediaUrl || currentStatus.media.url} alt="Status" className="w-full h-full object-contain" />
                {currentStatus.content && (
                  <div className="absolute bottom-10 w-full text-center px-4">
                    <span className="bg-black/50 text-white px-4 py-2 rounded-xl text-sm backdrop-blur-sm inline-block">
                      {currentStatus.content}
                    </span>
                  </div>
                )}
              </div>
            )}

            {currentStatus.type === 'VIDEO' && currentStatus.media && (
              <div className="flex-1 bg-black">
                <video 
                  ref={videoRef}
                  src={statusMediaUrl || currentStatus.media.url} 
                  autoPlay 
                  className="w-full h-full object-contain"
                  onEnded={handleNext}
                  onTimeUpdate={(e) => {
                    const vid = e.currentTarget;
                    setProgress((vid.currentTime / vid.duration) * 100);
                  }}
                />
              </div>
            )}
          </div>

          {/* Invisible click areas for navigation */}
          <div 
            className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-w-resize" 
            onMouseDown={handlePressStart}
            onMouseUp={(e) => handlePressEnd(e, 'prev')}
            onTouchStart={handlePressStart}
            onTouchEnd={(e) => handlePressEnd(e, 'prev')}
          />
          <div 
            className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-e-resize" 
            onMouseDown={handlePressStart}
            onMouseUp={(e) => handlePressEnd(e, 'next')}
            onTouchStart={handlePressStart}
            onTouchEnd={(e) => handlePressEnd(e, 'next')}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );};