import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@zira/utils';
import { useSecureMedia } from '@/hooks/useSecureMedia';

interface VoiceNotePlayerProps {
  url: string;
  duration?: number;
  isOwnMessage: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ url, isOwnMessage }) => {
  const { secureUrl } = useSecureMedia(url);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!secureUrl) return;

    audioRef.current = new Audio(secureUrl);
    const audio = audioRef.current;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [secureUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-3 w-64 pt-1", isOwnMessage ? "text-white" : "text-text-primary")}>
      <button 
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all duration-200 focus:outline-none",
          isOwnMessage ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary-500 text-white hover:bg-primary-600"
        )}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div className="relative w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mb-1.5">
          <div 
            className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-100", isOwnMessage ? "bg-white/80" : "bg-primary-500")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] opacity-70 font-medium">
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};