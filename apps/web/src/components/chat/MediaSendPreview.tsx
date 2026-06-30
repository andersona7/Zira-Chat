import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw,
  ChevronLeft, ChevronRight, FileText, Download, Music, Plus, Send, Smile, Loader2, ArrowLeftRight
} from 'lucide-react';
import { IconButton } from '@zira/ui';
import { cn } from '@zira/utils';
import type { User } from '@zira/types';
import { compressImage } from '@/utils/media';
import { useContactNames } from '@/hooks/useContactNames';

export interface SelectedMediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  name: string;
  size: number;
  mimeType: string;
  caption: string;
  originalQuality?: boolean;
  thumbnailUrl?: string; // Generated for videos
  pageCount?: number; // PDF page count
}

interface MediaSendPreviewProps {
  files: SelectedMediaFile[];
  participants: User[];
  onClose: () => void;
  onSend: (
    filesToSend: {
      file: File;
      type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
      caption: string;
    }[],
    onProgress: (index: number, progress: number) => void
  ) => Promise<void>;
  onAddMore: (files: FileList) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onReorder: (newFiles: SelectedMediaFile[]) => void;
}

export const MediaSendPreview: React.FC<MediaSendPreviewProps> = ({
  files,
  participants,
  onClose,
  onSend,
  onAddMore,
  onRemove,
  onClearAll,
  onReorder,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgresses, setUploadProgresses] = useState<Record<number, number>>({});
  const { getContactName } = useContactNames();
  
  // Image zoom state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Video playback states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Audio playback states
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Caption input states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const captionInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  const activeMedia = files[activeIndex];

  // Emojis list
  const popularEmojis = ['😀', '😂', '😍', '👍', '❤️', '🔥', '👏', '🎉', '🙌', '😎', '💡', '✨', '🥺', '😡', '🤔', '👀', '💯'];

  // Handle closing Emoji Picker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation & actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUploading) return;
      if (document.activeElement?.tagName === 'INPUT' && e.key !== 'Escape' && e.key !== 'Enter') {
        return; // Let typing handle input unless Esc/Enter
      }
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (activeIndex < files.length - 1) {
            setActiveIndex(activeIndex + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
          }
          break;
        case 'Delete':
          e.preventDefault();
          handleRemove(activeMedia.id);
          break;
        case 'Enter':
          e.preventDefault();
          if (document.activeElement?.tagName === 'INPUT' && showMentions) {
            // let mention selection handle it
            return;
          }
          handleSendAction();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, files, activeMedia, isUploading, showMentions]);

  // Reset zoom, rotation, video/audio play state on active file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsPlaying(false);
    setIsAudioPlaying(false);
    setCurrentTime(0);
    setAudioCurrentTime(0);
    setShowEmojiPicker(false);
    setShowMentions(false);

    if (videoRef.current) {
      videoRef.current.load();
    }
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [activeIndex]);

  // Mentions list filtering
  const filteredParticipants = useMemo(() => {
    if (!mentionQuery) return participants;
    return participants.filter(p => 
      getContactName(p.id || (p as any)._id, p).toLowerCase().includes(mentionQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [participants, mentionQuery, getContactName]);

  const handleCaptionChange = (val: string) => {
    if (val.length > 1024) return;
    
    // Update caption on active file
    const updatedFiles = [...files];
    updatedFiles[activeIndex] = { ...activeMedia, caption: val };
    onReorder(updatedFiles);

    // Check for @mention trigger
    const cursor = captionInputRef.current?.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastWord = textBeforeCursor.split(/\s/).pop() || '';
    
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.slice(1));
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (user: User) => {
    const val = activeMedia.caption;
    const cursor = captionInputRef.current?.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const textAfterCursor = val.slice(cursor);
    
    const lastSpaceIdx = textBeforeCursor.lastIndexOf('@');
    const newTextBefore = textBeforeCursor.slice(0, lastSpaceIdx) + `@${user.username} `;
    
    const updatedFiles = [...files];
    updatedFiles[activeIndex] = { ...activeMedia, caption: newTextBefore + textAfterCursor };
    onReorder(updatedFiles);
    
    setShowMentions(false);
    setTimeout(() => {
      captionInputRef.current?.focus();
    }, 50);
  };

  const insertEmoji = (emoji: string) => {
    const val = activeMedia.caption;
    const cursor = captionInputRef.current?.selectionStart || 0;
    const textBefore = val.slice(0, cursor);
    const textAfter = val.slice(cursor);
    
    const updatedFiles = [...files];
    updatedFiles[activeIndex] = { ...activeMedia, caption: textBefore + emoji + textAfter };
    onReorder(updatedFiles);

    setShowEmojiPicker(false);
    setTimeout(() => {
      captionInputRef.current?.focus();
    }, 50);
  };

  const handleRemove = (id: string) => {
    if (files.length === 1) {
      onClose();
      return;
    }
    const idx = files.findIndex(f => f.id === id);
    onRemove(id);
    if (activeIndex >= files.length - 1) {
      setActiveIndex(Math.max(0, files.length - 2));
    } else if (activeIndex > idx) {
      setActiveIndex(activeIndex - 1);
    }
  };

  // Reordering controls (move active item left/right)
  const moveActiveItem = (direction: 'left' | 'right') => {
    if (direction === 'left' && activeIndex > 0) {
      const newFiles = [...files];
      const temp = newFiles[activeIndex];
      newFiles[activeIndex] = newFiles[activeIndex - 1];
      newFiles[activeIndex - 1] = temp;
      onReorder(newFiles);
      setActiveIndex(activeIndex - 1);
    } else if (direction === 'right' && activeIndex < files.length - 1) {
      const newFiles = [...files];
      const temp = newFiles[activeIndex];
      newFiles[activeIndex] = newFiles[activeIndex + 1];
      newFiles[activeIndex + 1] = temp;
      onReorder(newFiles);
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleSendAction = async () => {
    if (isUploading) return;
    setIsUploading(true);
    
    try {
      const filesToSend = await Promise.all(
        files.map(async (f) => {
          let fileObj = f.file;
          // Apply compression for image files if originalQuality is not checked
          if (f.type === 'IMAGE' && !f.originalQuality) {
            try {
              fileObj = await compressImage(f.file);
            } catch (err) {
              console.error('Failed to compress image:', err);
            }
          }
          return {
            file: fileObj,
            type: f.type,
            caption: f.caption,
          };
        })
      );

      await onSend(filesToSend, (index, progress) => {
        setUploadProgresses(prev => ({
          ...prev,
          [index]: progress
        }));
      });

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  // Video Custom Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handlePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Audio Custom Controls
  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play();
      setIsAudioPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  // Helper formats
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Master upload progress calculation
  const totalProgress = useMemo(() => {
    const counts = Object.values(uploadProgresses);
    if (!counts.length) return 0;
    const sum = counts.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / files.length);
  }, [uploadProgresses, files.length]);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-30 flex flex-col justify-between overflow-hidden p-4 md:p-6 transition-all duration-300">
      
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <IconButton label="Back / Close" onClick={onClose} disabled={isUploading} className="w-9 h-9">
            <X className="w-5 h-5" />
          </IconButton>
          <div>
            <h3 className="font-semibold text-text-primary text-[15px]">
              Preview files ({files.length})
            </h3>
            <p className="text-xs text-text-secondary">
              {activeMedia.name} • {formatSize(activeMedia.size)} • {activeMedia.type}
            </p>
          </div>
        </div>

        {/* Action Controls & Original Quality checkbox */}
        <div className="flex items-center gap-3">
          {activeMedia.type === 'IMAGE' && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary select-none">
              <input
                type="checkbox"
                checked={activeMedia.originalQuality || false}
                disabled={isUploading}
                onChange={(e) => {
                  const updated = [...files];
                  updated[activeIndex] = { ...activeMedia, originalQuality: e.target.checked };
                  onReorder(updated);
                }}
                className="rounded border-border text-primary-500 focus:ring-primary-500/20"
              />
              Send Original Quality
            </label>
          )}

          <button
            onClick={onClearAll}
            disabled={isUploading}
            className="text-xs font-semibold text-error hover:text-error/80 px-2 py-1 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-4 relative group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMedia.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {activeMedia.type === 'IMAGE' && (
              <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
                <div 
                  className="transition-transform duration-200 flex items-center justify-center"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                  <img
                    src={activeMedia.preview}
                    alt={activeMedia.name}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-elevated"
                  />
                </div>
                
                {/* Floating zoom/rotate controls */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-surface/80 glass px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                  <IconButton label="Zoom In" onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))} className="w-8 h-8">
                    <ZoomIn className="w-4 h-4" />
                  </IconButton>
                  <IconButton label="Zoom Out" onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))} className="w-8 h-8">
                    <ZoomOut className="w-4 h-4" />
                  </IconButton>
                  <IconButton label="Rotate" onClick={() => setRotation(prev => prev + 90)} className="w-8 h-8">
                    <RotateCcw className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            )}

            {activeMedia.type === 'VIDEO' && (
              <div ref={videoContainerRef} className="relative bg-black rounded-xl overflow-hidden max-h-[60vh] w-full max-w-[500px] aspect-video flex items-center justify-center group/video-controls">
                <video
                  ref={videoRef}
                  src={activeMedia.preview}
                  muted={isMuted}
                  autoPlay
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onClick={togglePlay}
                  className="w-full h-full object-contain"
                />

                {/* Video controls overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 flex flex-col justify-between opacity-0 group-hover/video-controls:opacity-100 transition-opacity p-3">
                  <div className="flex justify-end">
                    {document.pictureInPictureEnabled && (
                      <button onClick={handlePiP} className="text-white text-xs bg-black/40 hover:bg-black/60 px-2 py-1 rounded">
                        PiP
                      </button>
                    )}
                  </div>
                  
                  {/* Play & Slider Controls */}
                  <div className="flex flex-col gap-2">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleVideoSeek}
                      className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    
                    <div className="flex justify-between items-center text-white text-sm">
                      <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="hover:text-primary-400">
                          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                        </button>
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={toggleMute} className="hover:text-primary-400">
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <button onClick={toggleFullscreen} className="hover:text-primary-400">
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeMedia.type === 'AUDIO' && (
              <div className="bg-surface glass border border-border p-6 rounded-2xl w-full max-w-[400px] flex flex-col gap-4 shadow-elevated">
                <audio
                  ref={audioRef}
                  src={activeMedia.preview}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                />
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleAudioPlay} 
                    className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                  >
                    {isAudioPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary text-sm truncate">{activeMedia.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{formatTime(audioCurrentTime)} / {formatTime(audioDuration)}</p>
                  </div>
                </div>

                {/* Waveform / seek control slider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      step={0.1}
                      value={audioCurrentTime}
                      onChange={handleAudioSeek}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeMedia.type === 'DOCUMENT' && (
              <div className="bg-surface glass border border-border p-6 rounded-2xl w-full max-w-[320px] flex flex-col items-center text-center shadow-elevated">
                <div className="p-4 bg-primary-500/10 rounded-2xl mb-4 text-primary-500">
                  <FileText className="w-12 h-12" />
                </div>
                <h4 className="font-semibold text-text-primary text-base truncate w-full px-2">
                  {activeMedia.name}
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  {formatSize(activeMedia.size)} • {activeMedia.file.name.split('.').pop()?.toUpperCase()} Document
                </p>
                {activeMedia.pageCount !== undefined && (
                  <p className="text-xs text-text-secondary mt-1 font-medium bg-surface-hover px-2 py-0.5 rounded border border-border">
                    {activeMedia.pageCount} Pages
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption Input with Emojis & Mentions */}
      <div className="mb-4 relative">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              ref={emojiPickerRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-2 p-2 bg-surface glass border border-border rounded-xl shadow-elevated grid grid-cols-6 gap-2 z-40"
            >
              {popularEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-surface-hover rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMentions && filteredParticipants.length > 0 && (
            <motion.div
              ref={mentionsRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-2 w-56 max-h-40 overflow-y-auto bg-surface glass border border-border rounded-xl shadow-elevated py-1 z-40"
            >
              {filteredParticipants.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectMention(user)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold text-[9px]">
                    {(getContactName(user.id || (user as any)._id, user) || '?')[0]?.toUpperCase()}
                  </div>
                  <span>{getContactName(user.id || (user as any)._id, user)}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp-style Input */}
        <div className="flex items-center gap-2 bg-surface-hover rounded-xl border border-border px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary-500/20">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isUploading}
            className="text-text-secondary hover:text-text-primary p-1"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <input
            ref={captionInputRef}
            type="text"
            placeholder="Add a caption..."
            value={activeMedia.caption}
            disabled={isUploading}
            onChange={(e) => handleCaptionChange(e.target.value)}
            className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none border-none outline-none"
          />

          <span className="text-[10px] text-text-muted select-none">
            {activeMedia.caption.length} / 1024
          </span>
        </div>
      </div>

      {/* Bottom strip: thumbnails and controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center border-t border-border pt-4 min-h-[90px]">
        {/* Reordering indicators / arrows (only show if multiple items) */}
        {files.length > 1 && (
          <div className="flex gap-1">
            <IconButton
              label="Move Left"
              disabled={activeIndex === 0 || isUploading}
              onClick={() => moveActiveItem('left')}
              className="w-8 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <IconButton
              label="Move Right"
              disabled={activeIndex === files.length - 1 || isUploading}
              onClick={() => moveActiveItem('right')}
              className="w-8 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        {/* Horizontal Strip */}
        <div className="flex-1 flex gap-2 overflow-x-auto py-1 max-w-full custom-scrollbar items-center">
          {files.map((file, idx) => (
            <div
              key={file.id}
              onClick={() => !isUploading && setActiveIndex(idx)}
              className={cn(
                "relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                activeIndex === idx ? "border-primary-500 scale-105" : "border-border hover:border-text-secondary"
              )}
            >
              {file.type === 'IMAGE' && (
                <img src={file.preview} alt="Thumbnail" className="w-full h-full object-cover" />
              )}
              {file.type === 'VIDEO' && (
                <div className="w-full h-full bg-black relative flex items-center justify-center">
                  {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-white font-bold">VIDEO</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-3 h-3 fill-white text-white" />
                  </div>
                </div>
              )}
              {file.type === 'AUDIO' && (
                <div className="w-full h-full bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
              )}
              {file.type === 'DOCUMENT' && (
                <div className="w-full h-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              )}

              {/* Individual remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(file.id);
                }}
                disabled={isUploading}
                className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 scale-90 shadow-sm opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition-opacity"
                style={{ opacity: isUploading ? 0 : undefined }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Plus Add More Button */}
          <label className="shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-text-secondary flex items-center justify-center cursor-pointer transition-all">
            <input
              type="file"
              multiple
              disabled={isUploading}
              onChange={(e) => e.target.files && onAddMore(e.target.files)}
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt"
            />
            <Plus className="w-5 h-5 text-text-secondary" />
          </label>
        </div>

        {/* Send Button & Progress overlay */}
        <div className="relative">
          <button
            onClick={handleSendAction}
            disabled={isUploading}
            className="bg-primary-500 text-white hover:bg-primary-600 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 select-none disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <span>Send</span>
                <span className="bg-white text-primary-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {files.length}
                </span>
                <Send className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full-overlay Upload Progress Panel */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center">
            {/* Circular progress loader */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-border"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * totalProgress) / 100}
                className="text-primary-500 transition-all duration-300"
              />
            </svg>
            <span className="absolute text-lg font-bold text-text-primary">{totalProgress}%</span>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-text-primary text-sm">Uploading media files</h4>
            <p className="text-xs text-text-secondary mt-1">Please keep this window open</p>
          </div>
        </div>
      )}
    </div>
  );
};
