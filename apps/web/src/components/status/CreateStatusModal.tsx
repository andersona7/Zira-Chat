import React, { useState, useRef } from 'react';
import { Dialog, IconButton, Button } from '@zira/ui';
import { Image as ImageIcon, Type, Send, ArrowLeft } from 'lucide-react';
import { useCreateStatusMutation } from '@/store/api/statusApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import toast from 'react-hot-toast';
import { cn } from '@zira/utils';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BG_COLORS = ['#8B5CF6', '#14B8A6', '#F43F5E', '#F59E0B', '#3B82F6', '#0F0C20'];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'TYPE' | 'TEXT' | 'MEDIA'>('TYPE');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [createStatus, { isLoading }] = useCreateStatusMutation();
  const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode('TYPE');
    setText('');
    setFile(null);
    setPreview(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) return toast.error('Max file size is 15MB');
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setMode('MEDIA');
    }
  };

  const handleSubmit = async () => {
    try {
      if (mode === 'TEXT' && text.trim()) {
        await createStatus({ type: 'TEXT', content: text, backgroundColor: bgColor }).unwrap();
      } else if (mode === 'MEDIA' && file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadMedia(formData).unwrap();
        if (res.success && res.data) {
          const type = file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO';
          await createStatus({ type, media: res.data, content: text }).unwrap();
        }
      }
      toast.success('Status updated');
      handleClose();
    } catch (err) {
      toast.error('Failed to create status');
    }
  };
  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create Status" className="max-w-lg">
      <div className={cn(
        "flex flex-col -m-6 -mt-0 transition-all duration-300 overflow-hidden",
        mode === 'TYPE' ? "h-[260px]" : "h-[520px]"
      )}>
        {mode === 'TYPE' && (
          <div className="flex-1 flex items-center justify-center gap-8 p-6 bg-background">
            <button 
              onClick={() => setMode('TEXT')}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-105 active:scale-95 transition-all duration-300 w-44 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-neo-out-sm border border-white/10 group-hover:scale-110 transition-all duration-300">
                <Type className="w-8 h-8 text-white animate-pulse" />
              </div>
              <span className="text-text-primary font-bold text-sm tracking-wide">Text Status</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-105 active:scale-95 transition-all duration-300 w-44 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-neo-out-sm border border-white/10 group-hover:scale-110 transition-all duration-300">
                <ImageIcon className="w-8 h-8 text-white animate-pulse" />
              </div>
              <span className="text-text-primary font-bold text-sm tracking-wide">Photo / Video</span>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
            </button>
          </div>
        )}

        {mode === 'TEXT' && (
          <div className="flex-1 flex flex-col relative" style={{ backgroundColor: bgColor }}>
            {/* Back Button */}
            <div className="absolute top-4 left-4 z-10">
              <IconButton 
                label="Back" 
                onClick={() => setMode('TYPE')} 
                className="bg-black/20 text-white hover:bg-black/30 border border-white/10 shadow-neo-out-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </IconButton>
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a status..."
              className="flex-1 w-full bg-transparent text-white text-3xl font-display text-center p-12 pt-16 resize-none focus:outline-none placeholder:text-white/50"
            />
            <div className="p-4 flex justify-between items-center bg-black/20">
              <div className="flex gap-2">
                {BG_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setBgColor(color)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110", bgColor === color ? "border-white scale-110" : "border-transparent")}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button onClick={handleSubmit} isLoading={isLoading} disabled={!text.trim()} className="bg-white text-black hover:bg-white/90">
                <Send className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </div>
        )}

        {mode === 'MEDIA' && (
          <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-4 left-4 z-20">
              <IconButton 
                label="Back" 
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setMode('TYPE');
                }} 
                className="bg-black/35 text-white hover:bg-black/50 border border-white/10 shadow-neo-out-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </IconButton>
            </div>

            {/* Blurred Background Image Backdrop */}
            {!file?.type.startsWith('video/') && (
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-110 opacity-30 select-none pointer-events-none"
                style={{ backgroundImage: `url(${preview})` }}
              />
            )}
            
            {/* Main Preview Container */}
            <div className="flex-1 flex items-center justify-center relative p-4 min-h-0 z-10">
              {file?.type.startsWith('video/') ? (
                <video 
                  src={preview!} 
                  controls 
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl border border-white/5" 
                />
              ) : (
                <img 
                  src={preview!} 
                  alt="Preview" 
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl border border-white/5 transition-all duration-300" 
                />
              )}
            </div>
            
            {/* Caption Input Panel */}
            <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex gap-3 z-10 items-center">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1 bg-white/10 text-white placeholder:text-white/40 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all text-sm"
              />
              <Button 
                onClick={handleSubmit} 
                isLoading={isLoading || isUploading} 
                className="shrink-0 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-neo-out-sm border border-white/10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};