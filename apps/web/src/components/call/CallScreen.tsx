import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Monitor, SwitchCamera } from 'lucide-react';
import { Avatar, IconButton } from '@zira/ui';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { acceptCall, endCall } from '@/store/slices/callSlice';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { cn } from '@zira/utils';
import { playNotificationSound } from '@/utils/audio';
import { useContactNames } from '@/hooks/useContactNames';

export const CallScreen: React.FC = () => {
  const callState = useSelector((state: RootState) => state.call);
  const dispatch = useDispatch();
  const { getContactName } = useContactNames();
  const { localStream, remoteStream, answerCall, cleanup, toggleScreenShare, toggleCameraFacing, isScreenSharing } = useWebRTC();
  const { emitCallReject, emitCallEnd } = useSocket();

  const isVideoCall = callState.type === 'VIDEO';
  const showVideoGrid = isVideoCall && callState.isActive && remoteStream;
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Play looping ringtone when call is incoming
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.isIncoming && !callState.isActive) {
      playNotificationSound();
      interval = setInterval(() => {
        playNotificationSound();
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isIncoming, callState.isActive]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.isActive) {
      setDuration(0);
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState.isActive]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState.type, showVideoGrid]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState.type, showVideoGrid]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && !isVideoCall) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVideoCall, callState.isActive]);

  const handleAccept = () => {
    dispatch(acceptCall());
    answerCall();
  };

  const handleReject = () => {
    if (callState.remoteUser) emitCallReject(callState.remoteUser.id);
    dispatch(endCall());
  };

  const handleEndCall = () => {
    if (callState.remoteUser) emitCallEnd(callState.remoteUser.id);
    cleanup();
    dispatch(endCall());
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!callState.isIncoming && !callState.isOutgoing && !callState.isActive) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Main View Area */}
        <div className="relative w-full h-full max-w-5xl max-h-[800px] flex flex-col items-center justify-center p-8">
          
          {/* Header Info (Visible when not in active video) */}
          {!showVideoGrid && (
            <div className="flex flex-col items-center space-y-6 mb-12">
              <Avatar src={callState.remoteUser?.avatarUrl} fallback={getContactName(callState.remoteUser?.id || (callState.remoteUser as any)?._id, callState.remoteUser)} size="2xl" className="!w-32 !h-32 shadow-2xl ring-4 ring-primary-500/20" />
              <div className="text-center">
                <h2 className="text-4xl font-display font-medium text-text-primary">{getContactName(callState.remoteUser?.id || (callState.remoteUser as any)?._id, callState.remoteUser)}</h2>
                <p className="text-text-secondary text-lg mt-2 tracking-wide">
                  {callState.isIncoming && !callState.isActive ? `Incoming ${callState.type?.toLowerCase()} call...` : ''}
                  {callState.isOutgoing && !callState.isActive ? 'Ringing...' : ''}
                  {callState.isActive ? formatDuration(duration) : ''}
                </p>
              </div>
            </div>
          )}

          {/* Video Grid (Only visible during active video call) */}
          {showVideoGrid && (
            <div className="w-full flex-1 flex gap-4 p-4 min-h-0">
              <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border border-border shadow-elevated">
                 <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                 <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-xl text-white text-sm">
                   {getContactName(callState.remoteUser?.id || (callState.remoteUser as any)?._id, callState.remoteUser)}
                 </div>
              </div>
              <div className="relative w-1/4 max-w-[300px] bg-black rounded-3xl overflow-hidden border border-border shadow-xl self-end h-auto aspect-[3/4]">
                 <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover", isVideoOff && "hidden")} />
                 {isVideoOff && (
                   <div className="w-full h-full flex flex-col items-center justify-center bg-surface">
                     <Avatar fallback="Me" size="lg" />
                   </div>
                 )}
              </div>
            </div>
          )}

          {/* Controls Dock */}
          <div className="absolute bottom-12 flex items-center gap-4 glass bg-surface/80 px-8 py-4 rounded-2xl border border-border shadow-elevated">
            {callState.isIncoming && !callState.isActive ? (
              <>
                <button onClick={handleReject} className="w-14 h-14 rounded-full bg-error text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 shadow-lg">
                  <PhoneOff className="w-6 h-6" />
                </button>
                <button onClick={handleAccept} className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center hover:bg-teal-400 transition-all hover:scale-105 shadow-lg animate-bounce">
                  <Phone className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <IconButton 
                  label="Mute Audio" 
                  onClick={toggleMute}
                  className={cn("w-12 h-12 rounded-xl", isMuted ? "bg-white text-black hover:bg-white/90" : "bg-surface-hover text-text-primary hover:bg-surface")}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </IconButton>
                
                {isVideoCall && (
                  <>
                    <IconButton 
                      label="Toggle Video" 
                      onClick={toggleVideo}
                      className={cn("w-12 h-12 rounded-xl", isVideoOff ? "bg-white text-black hover:bg-white/90" : "bg-surface-hover text-text-primary hover:bg-surface")}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </IconButton>
                    <IconButton 
                      label="Share Screen" 
                      onClick={toggleScreenShare}
                      className={cn("w-12 h-12 rounded-xl", isScreenSharing ? "bg-accent text-white hover:bg-teal-400" : "bg-surface-hover text-text-primary hover:bg-surface")}
                    >
                      <Monitor className="w-5 h-5" />
                    </IconButton>
                    <IconButton 
                      label="Switch Camera" 
                      onClick={toggleCameraFacing}
                      className="w-12 h-12 bg-surface-hover text-text-primary hover:bg-surface rounded-xl"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </IconButton>
                  </>
                )}

                <button onClick={handleEndCall} className="w-14 h-14 rounded-full bg-error text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 shadow-lg ml-4">
                  <PhoneOff className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
        {/* Hidden audio for voice calls to bind the remote stream */}
        {!isVideoCall && callState.isActive && remoteStream && (
          <audio ref={remoteAudioRef} autoPlay />
        )}
      </motion.div>
    </AnimatePresence>
  );
};