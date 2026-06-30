import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, ZoomIn, ZoomOut, Maximize2, 
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX,
  FileText, File, Music, Video, Loader2, ExternalLink, FileArchive, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@zira/utils';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useContactNames } from '@/hooks/useContactNames';
import { useSecureMedia } from '@/hooks/useSecureMedia';
import type { Message, User } from '@zira/types';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  allMessages: Message[];
  onNavigate: (message: Message) => void;
  participants: User[];
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  message,
  allMessages,
  onNavigate,
  participants,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { getContactName } = useContactNames();

  const senderLabel = useMemo(() => {
    if (message.senderId === currentUser?.id) return 'You';
    const senderUser = participants.find(p => p.id === message.senderId);
    return getContactName(message.senderId, senderUser) || 'Contact';
  }, [message.senderId, currentUser?.id, participants, getContactName]);

  // Media info extraction
  const media = message.media;
  
  const mediaSource = media ? (media.mediaId || media.url) : '';
  const { secureUrl } = useSecureMedia(mediaSource);
  
  const fileUrl = secureUrl || media?.url || '';
  const fileName = media?.name || '';
  const fileSize = media?.size || 0;
  const mimeType = (media?.mimeType || '').toLowerCase();

  // Determine media type with strict mutual exclusivity based on MIME types
  let isImage = false;
  let isVideo = false;
  let isAudio = false;
  let isPdf = false;
  let isText = false;
  let isOffice = false;
  let isArchive = false;

  const officeExtensions = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
  const zipExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];
  const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.xml', '.yml', '.yaml'];

  if (mimeType) {
    if (mimeType.startsWith('image/')) {
      isImage = true;
    } else if (mimeType.startsWith('video/')) {
      isVideo = true;
    } else if (mimeType.startsWith('audio/')) {
      isAudio = true;
    } else if (mimeType === 'application/pdf') {
      isPdf = true;
    } else if (mimeType.startsWith('text/')) {
      isText = true;
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      isArchive = true;
    } else if (officeExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
      isOffice = true;
    }
  }

  // Fallback to extension ONLY if none of the primary categories were matched
  if (!isImage && !isVideo && !isAudio && !isPdf && !isText && !isOffice && !isArchive && fileName) {
    const lowerName = fileName.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'].some(ext => lowerName.endsWith(ext))) {
      isImage = true;
    } else if (['.mp4', '.mov', '.mkv', '.avi', '.m4v', '.webm'].some(ext => lowerName.endsWith(ext))) {
      isVideo = true;
    } else if (['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'].some(ext => lowerName.endsWith(ext))) {
      isAudio = true;
    } else if (lowerName.endsWith('.pdf')) {
      isPdf = true;
    } else if (textExtensions.some(ext => lowerName.endsWith(ext))) {
      isText = true;
    } else if (officeExtensions.some(ext => lowerName.endsWith(ext))) {
      isOffice = true;
    } else if (zipExtensions.some(ext => lowerName.endsWith(ext))) {
      isArchive = true;
    }
  }

  // Text loading state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Image zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Video and Audio Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch text file content
  useEffect(() => {
    if (isOpen && isText && fileUrl) {
      setLoadingText(true);
      setTextError(null);
      setTextContent(null);
      fetch(fileUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load text content');
          return res.text();
        })
        .then(data => {
          setTextContent(data);
          setLoadingText(false);
        })
        .catch(err => {
          setTextError(err.message || 'Error loading file');
          setLoadingText(false);
        });
    }
  }, [isOpen, isText, fileUrl]);

  // Gallery mode navigation lists
  const mediaMessages = useMemo(() => {
    return allMessages.filter(m => 
      m.chatId === message.chatId && 
      m.media && 
      m.media.url && 
      !m.isDeleted &&
      ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(m.type)
    );
  }, [allMessages, message.chatId]);

  const currentIndex = mediaMessages.findIndex(m => m.id === message.id);
  const hasPrev = mediaMessages.length > 1 && currentIndex > 0;
  const hasNext = mediaMessages.length > 1 && currentIndex < mediaMessages.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(mediaMessages[currentIndex - 1]);
      resetImageState();
    }
  }, [hasPrev, currentIndex, mediaMessages, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(mediaMessages[currentIndex + 1]);
      resetImageState();
    }
  }, [hasNext, currentIndex, mediaMessages, onNavigate]);

  // Reset image zoom & pan
  const resetImageState = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Keyboard navigation & ESC close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    firstElement?.focus();
    document.addEventListener('keydown', handleTabTrap);
    return () => {
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [isOpen, message.id]);

  // Download helper preserving filename
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      // Fallback
      window.open(fileUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Image zoom wheel event handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isImage) return;
    e.preventDefault();
    const zoomFactor = 0.1;
    const nextScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor;
    setScale(Math.min(Math.max(nextScale, 0.5), 6));
  };

  // Image Panning Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Video/Audio handlers
  const togglePlay = () => {
    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;
    
    const value = parseFloat(e.target.value);
    mediaElement.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;
    
    const value = parseFloat(e.target.value);
    mediaElement.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;
    
    mediaElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;
    
    const speed = parseFloat(e.target.value);
    mediaElement.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper for size display
  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown Size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  if (!media) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black/90 backdrop-blur-md select-none overflow-hidden font-sans">
          {/* Header */}
          <motion.header 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="flex items-center justify-between px-6 py-4 glass bg-surface/10 border-b border-white/10 z-[100] w-full"
          >
            <div className="flex flex-col text-left max-w-2/3">
              <span className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                Sent by {senderLabel}
              </span>
              <h2 className="text-white font-medium truncate text-sm md:text-base mt-0.5" title={fileName}>
                {fileName}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 disabled:opacity-50"
                aria-label="Download Original File"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              <button 
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
                aria-label="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.header>

          {/* Main Stage */}
          <div 
            ref={modalRef}
            className="flex-1 w-full relative flex items-center justify-center p-4 min-h-0"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Gallery Left Arrow */}
            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-6 w-12 h-12 rounded-full glass bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-all z-[110]"
                aria-label="Previous Media"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Stage Content */}
            <div className="w-full h-full flex items-center justify-center max-w-4xl max-h-[80vh] relative min-h-0 min-w-0" onClick={(e) => e.stopPropagation()}>
              {/* IMAGE */}
              {isImage && (
                <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
                  <motion.img
                    ref={imageRef}
                    src={fileUrl}
                    alt={fileName}
                    style={{
                      scale,
                      x: position.x,
                      y: position.y,
                      cursor: scale > 1 ? 'grab' : 'default',
                    }}
                    animate={isDragging ? undefined : { x: position.x, y: position.y }}
                    onDoubleClick={resetImageState}
                    className="max-w-full max-h-full object-contain pointer-events-auto rounded-lg shadow-2xl transition-all duration-75 select-none"
                  />
                </div>
              )}

              {/* VIDEO */}
              {isVideo && (
                <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shadow-elevated">
                  <video
                    ref={videoRef}
                    src={fileUrl}
                    preload="metadata"
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                  />
                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                    </div>
                  )}
                </div>
              )}

              {/* AUDIO */}
              {isAudio && (
                <div className="w-full max-w-lg glass bg-surface/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 text-white shadow-elevated">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
                      <Music className="w-6 h-6 text-primary-400 animate-pulse" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate text-sm">{fileName}</p>
                      <p className="text-xs text-white/60 mt-0.5">{formatSize(fileSize)}</p>
                    </div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={fileUrl}
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                    onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                  />
                  {/* Progress scrubber */}
                  <div className="flex items-center gap-3 text-xs">
                    <span>{formatDuration(currentTime)}</span>
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1.5 rounded-full bg-white/20 accent-primary-500 cursor-pointer appearance-none outline-none"
                    />
                    <span>{formatDuration(duration)}</span>
                  </div>
                  {/* Audio Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center text-white transition-all shadow-md focus:outline-none"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div className="flex items-center gap-3">
                      <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.05} 
                        value={isMuted ? 0 : volume} 
                        onChange={handleVolumeChange}
                        className="w-20 h-1 rounded-full bg-white/20 accent-primary-500 cursor-pointer appearance-none"
                      />
                    </div>
                    <select 
                      value={playbackRate} 
                      onChange={handleSpeedChange}
                      className="bg-white/10 border border-white/10 rounded-lg text-xs px-2 py-1 text-white focus:outline-none"
                    >
                      <option value="0.5" className="text-black">0.5x</option>
                      <option value="1" className="text-black">1.0x</option>
                      <option value="1.5" className="text-black">1.5x</option>
                      <option value="2" className="text-black">2.0x</option>
                    </select>
                  </div>
                </div>
              )}

              {/* PDF */}
              {isPdf && (
                <div className="w-full h-full bg-surface border border-white/10 rounded-xl overflow-hidden shadow-elevated flex flex-col">
                  <iframe 
                    src={`${fileUrl}#toolbar=1`}
                    className="w-full flex-1 border-0 bg-white"
                    title={fileName}
                  />
                </div>
              )}

              {/* TEXT FILE */}
              {isText && (
                <div className="w-full h-full glass bg-surface/20 border border-white/10 rounded-xl overflow-hidden flex flex-col text-white shadow-elevated text-left">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-white/60">
                    <span>Text Contents</span>
                    <span>{formatSize(fileSize)}</span>
                  </div>
                  <div className="flex-1 p-4 overflow-auto custom-scrollbar font-mono text-xs md:text-sm selection:bg-primary-500 select-text whitespace-pre-wrap leading-relaxed">
                    {loadingText ? (
                      <div className="flex justify-center items-center h-full gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                        <span>Reading file content...</span>
                      </div>
                    ) : textError ? (
                      <p className="text-error">{textError}</p>
                    ) : (
                      textContent
                    )}
                  </div>
                </div>
              )}

              {/* OFFICE, ARCHIVE, OR OTHER UNKNOWN FORMATS */}
              {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
                <div className="w-full max-w-md glass bg-surface/20 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center gap-6 text-white shadow-elevated">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                    {isOffice && <FileText className="w-8 h-8 text-primary-400" />}
                    {isArchive && <FileArchive className="w-8 h-8 text-amber-400" />}
                    {!isOffice && !isArchive && <File className="w-8 h-8 text-sky-400" />}
                  </div>
                  <div className="space-y-2 w-full">
                    <h3 className="font-semibold text-base break-all px-2">{fileName}</h3>
                    <p className="text-xs text-white/50">{mimeType || 'Unknown file format'}</p>
                  </div>
                  
                  <div className="w-full grid grid-cols-2 gap-4 text-xs text-white/60 border-t border-white/10 pt-4">
                    <div className="text-left space-y-1">
                      <p className="text-white/40">File Size</p>
                      <p className="font-medium text-white">{formatSize(fileSize)}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-white/40">Upload Date</p>
                      <p className="font-medium text-white">
                        {format(new Date(message.createdAt), 'MMM dd, yyyy hh:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full mt-2">
                    <button 
                      onClick={handleDownload}
                      className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" /> Download Original
                    </button>
                    <a 
                      href={fileUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Open In Tab
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Gallery Right Arrow */}
            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-6 w-12 h-12 rounded-full glass bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-all z-[110]"
                aria-label="Next Media"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Footer controls (only for images, video, and audio players) */}
          <motion.footer 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="flex items-center justify-between px-6 py-4 glass bg-surface/10 border-t border-white/10 z-[100] w-full"
          >
            {/* Left Controls */}
            <div className="flex items-center gap-4">
              {isImage && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScale(Math.max(scale - 0.25, 0.5))} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-white text-xs font-mono min-w-[40px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button 
                    onClick={() => setScale(Math.min(scale + 0.25, 6))} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={resetImageState} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Video Specific controls */}
              {isVideo && (
                <div className="flex items-center gap-4 text-white text-xs">
                  <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="font-mono">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                      {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.05} 
                      value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange}
                      className="w-16 h-1 rounded-full bg-white/20 accent-primary-500 cursor-pointer appearance-none"
                    />
                  </div>
                  <select 
                    value={playbackRate} 
                    onChange={handleSpeedChange}
                    className="bg-white/10 border border-white/10 rounded-lg text-[10px] px-1.5 py-0.5 text-white focus:outline-none"
                  >
                    <option value="0.5" className="text-black">0.5x</option>
                    <option value="1" className="text-black">1.0x</option>
                    <option value="1.5" className="text-black">1.5x</option>
                    <option value="2" className="text-black">2.0x</option>
                  </select>
                </div>
              )}
            </div>

            {/* Middle Controls (indicators) */}
            <div className="hidden md:flex text-white/50 text-xs font-medium">
              File {currentIndex + 1} of {mediaMessages.length}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {isVideo && (
                <button 
                  onClick={toggleFullscreen} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              {isImage && (
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      modalRef.current?.requestFullscreen();
                    }
                  }} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>
            </div>
          </motion.footer>
        </div>
      )}
    </AnimatePresence>
  );
};
