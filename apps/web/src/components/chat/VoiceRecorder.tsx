import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Trash2, Send, Play } from 'lucide-react';
import { IconButton } from '@zira/ui';

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onSend: (blob: Blob) => void;
  getAnalyserData: () => Uint8Array | null;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  recordingTime,
  audioBlob,
  onStart,
  onStop,
  onCancel,
  onSend,
  getAnalyserData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas visualizer loop
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        const data = getAnalyserData();
        if (!data) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = 3;
        const gap = 2;
        const barCount = Math.floor(canvas.width / (barWidth + gap));
        const step = Math.floor(data.length / barCount);

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += data[i * step + j];
          }
          const average = sum / step;
          const amplitude = average / 255;
          
          const barHeight = Math.max(4, amplitude * canvas.height);
          
          // Use CSS custom property color
          const computedStyle = getComputedStyle(document.documentElement);
          ctx.fillStyle = computedStyle.getPropertyValue('--color-primary-500').trim() || '#8B5CF6';
          ctx.beginPath();
          ctx.roundRect(
            i * (barWidth + gap),
            (canvas.height - barHeight) / 2,
            barWidth,
            barHeight,
            2
          );
          ctx.fill();
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording, getAnalyserData]);

  if (audioBlob) {
    // Preview Mode
    return (
      <div className="flex items-center gap-3 w-full bg-surface rounded-xl px-4 py-2 border border-border">
        <IconButton label="Delete" onClick={onCancel} className="text-error hover:bg-error/10 hover:text-error w-9 h-9">
          <Trash2 className="w-5 h-5" />
        </IconButton>
        
        <div className="flex-1 flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
             <Play className="w-4 h-4 text-white ml-0.5" />
           </div>
           <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div className="w-full h-full bg-primary-500 rounded-full" />
           </div>
           <span className="text-sm font-medium text-text-secondary min-w-[40px]">
             {formatTime(recordingTime)}
           </span>
        </div>

        <IconButton 
          label="Send" 
          onClick={() => onSend(audioBlob)} 
          className="bg-primary-500 text-white hover:bg-primary-600 w-10 h-10 rounded-xl"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </IconButton>
      </div>
    );
  }

  if (isRecording) {
    // Recording Mode
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 w-full bg-surface rounded-xl px-4 py-2 border border-primary-500/30"
      >
        <IconButton label="Cancel" onClick={onCancel} className="text-error hover:bg-error/10 hover:text-error shrink-0 w-9 h-9">
          <Trash2 className="w-5 h-5" />
        </IconButton>

        <div className="flex items-center gap-2 bg-error/10 px-3 py-1.5 rounded-full shrink-0">
          <motion.div 
            animate={{ opacity: [1, 0.3, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 rounded-full bg-error"
          />
          <span className="text-sm font-medium text-error w-10 text-center">
            {formatTime(recordingTime)}
          </span>
        </div>

        <div className="flex-1 h-8 mx-2 flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} width={200} height={32} className="w-full h-full" />
        </div>

        <IconButton 
          label="Stop" 
          onClick={onStop} 
          className="bg-primary-500 text-white hover:bg-primary-600 shrink-0 w-10 h-10 rounded-xl"
        >
          <Square className="w-4 h-4" />
        </IconButton>
      </motion.div>
    );
  }

  // Idle Mode (Just the mic button)
  return (
    <IconButton label="Record Voice Note" onClick={onStart} className="text-text-secondary hover:text-text-primary w-9 h-9 shrink-0">
      <Mic className="w-5 h-5" />
    </IconButton>
  );
};