import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { callConnected, endCall } from '../store/slices/callSlice';
import { useSocket } from './useSocket';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
};

export const useWebRTC = () => {
  const dispatch = useDispatch();
  const callState = useSelector((state: RootState) => state.call);
  const { socket, emitCallInitiate, emitCallAccept, emitIceCandidate } = useSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // Initialize PeerConnection
  const initPeerConnection = () => {
    if (peerConnection.current) return peerConnection.current;
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && callState.remoteUser) {
        emitIceCandidate(callState.remoteUser.id, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      switch(pc.connectionState) {
        case 'disconnected':
        case 'failed':
          toast.error('Connection unstable. Attempting reconnection...');
          try {
            pc.restartIce();
          } catch (e) {
            console.error('ICE restart failed', e);
          }
          break;
        case 'closed':
          dispatch(endCall());
          break;
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  // Get Local Media
  const getMedia = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode } : false });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      toast.error('Failed to access camera/microphone');
      return null;
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!peerConnection.current || !localStream) return;

    if (isScreenSharing) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };
        setIsScreenSharing(true);
      } catch (err) {
        toast.error('Failed to share screen');
      }
    }
  };

  // Toggle Camera Facing Mode
  const toggleCameraFacing = async () => {
    if (!localStream) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    const currentVideoTrack = localStream.getVideoTracks()[0];
    if (currentVideoTrack) currentVideoTrack.stop();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        newVideoTrack
      ]);
      setLocalStream(updatedStream);

      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
    } catch (e) {
      toast.error('Failed to switch camera');
    }
  };

  // Cleanup
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setRemoteStream(null);
    setIsScreenSharing(false);
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  // Handle Outgoing Call
  useEffect(() => {
    if (callState.isOutgoing && callState.remoteUser && !peerConnection.current) {
      const startCall = async () => {
        const stream = await getMedia(callState.type === 'VIDEO');
        if (!stream) {
          dispatch(endCall());
          return;
        }

        const pc = initPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emitCallInitiate(callState.remoteUser!.id, callState.type!, offer);
      };
      startCall();
    }
  }, [callState.isOutgoing]);

  // Handle Accepted Call (Caller side)
  useEffect(() => {
    if (!socket) return;
    
    const handleAccepted = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        dispatch(callConnected());
      }
    };

    socket.on('call_accepted', handleAccepted);
    return () => { socket.off('call_accepted', handleAccepted); };
  }, [socket, dispatch]);

  // Handle Answer incoming call
  const answerCall = async () => {
    if (!callState.offer || !callState.remoteUser) return;
    
    const stream = await getMedia(callState.type === 'VIDEO');
    if (!stream) {
      dispatch(endCall());
      return;
    }

    const pc = initPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    emitCallAccept(callState.remoteUser.id, answer);
  };

  // Handle ICE Candidates
  useEffect(() => {
    if (!socket) return;
    
    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (peerConnection.current && candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ice candidate', e);
        }
      }
    };

    socket.on('ice_candidate', handleIceCandidate);
    return () => { socket.off('ice_candidate', handleIceCandidate); };
  }, [socket]);

  // Cleanup on unmount or endCall
  useEffect(() => {
    if (!callState.isActive && !callState.isIncoming && !callState.isOutgoing) {
      cleanup();
    }
  }, [callState]);

  return { localStream, remoteStream, answerCall, cleanup, toggleScreenShare, toggleCameraFacing, isScreenSharing };
};