import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetMessagesQuery,
  useGetChatsQuery,
  chatApi,
  useVerifyLockerPinMutation,
  useSetupLockPinMutation,
  useVerifyPasswordForLockResetMutation,
  useRequestLockPinResetCodeMutation,
  useVerifyLockResetOtpMutation,
  useResetLockPinMutation,
} from '@/store/api/chatApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import { useBlockUserMutation, useUnblockUserMutation } from '@/store/api/userApi';
import { useSocket } from '@/hooks/useSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { initiateCall } from '@/store/slices/callSlice';
import { Avatar, IconButton, Dialog, Button, Input } from '@zira/ui';
import { cn } from '@zira/utils';
import {
  Send,
  Smile,
  Paperclip,
  X,
  FileText,
  MoreVertical,
  BellOff,
  Bell,
  Phone,
  Video as VideoIcon,
  ShieldAlert,
  Users,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MediaPreviewModal } from './MediaPreviewModal';
import { VoiceRecorder } from './VoiceRecorder';
import { ContactShareModal } from './ContactShareModal';
import { MediaSendPreview } from './MediaSendPreview';
import type { SelectedMediaFile } from './MediaSendPreview';
import { generateVideoThumbnail, getPdfPageCount } from '@/utils/media';
import { GroupDetailsPanel } from '../groups/GroupDetailsPanel';
import { useChatComposerFocus } from '@/hooks/useChatComposerFocus';
import { useExitLockedChat } from '@/hooks/useExitLockedChat';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { SearchMessagesPanel } from './SearchMessagesPanel';
import { MessageInfoPanel } from './MessageInfoPanel';
import { AIAssistantPanel } from './AIAssistantPanel';
import { useVirtualizer } from '@tanstack/react-virtual';
import { setCredentials } from '@/store/slices/authSlice';
import { setLockerUnlocked } from '@/store/slices/chatSlice';
import toast from 'react-hot-toast';
import type { Message } from '@zira/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useContactNames } from '@/hooks/useContactNames';
import { Sparkles, Search as SearchIcon } from 'lucide-react';
import { GifPicker, GifEntry } from '@/modules/gif';
import { useRecordUsageMutation } from '@/store/api/gifApi';

import { selectActiveChat } from '@/store/selectors';
import { executeTokenRefresh } from '@/store/api/baseQuery';

interface ChatAreaProps {
  onBack?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBack }) => {
  const activeChat = useSelector(selectActiveChat);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const typingUsers = useSelector((state: RootState) => state.chat.typingUsers || {});
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refreshAccessToken = async (): Promise<string | null> => {
    return executeTokenRefresh();
  };

  const dispatch = useDispatch();
  const { getContactName } = useContactNames();

  const [cursor, setCursor] = useState<string | null | undefined>(undefined);

  const isLockerUnlocked = useSelector((state: RootState) => state.chat.isLockerUnlocked);
  const isLocked = (activeChat as any)?.isLocked && !isLockerUnlocked;
  const isGroup = activeChat?.type === 'GROUP';
  const otherUser = activeChat?.participants?.find((p: any) => p.id !== currentUser?.id);
  const isBlockedByMe = !!(
    !isGroup &&
    otherUser &&
    currentUser?.blockedUsers?.includes(otherUser.id)
  );
  const blockedBy = useSelector((state: RootState) => state.auth.blockedBy) || [];
  const isBlockedByOther = !!(!isGroup && otherUser && blockedBy.includes(otherUser.id));
  const isBlocked = isBlockedByMe || isBlockedByOther;

  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    isFetching,
  } = useGetMessagesQuery(
    { chatId: activeChat?.id || '', cursor },
    { skip: !activeChat || isLocked }
  );

  const { data: chatsResponse } = useGetChatsQuery();
  const chatsList = chatsResponse?.data || [];

  const [uploadMedia] = useUploadMediaMutation();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const [recordGifUsage] = useRecordUsageMutation();
  const { sendMessage, socket } = useSocket();
  const audioRecorder = useAudioRecorder();

  // Chat Lock mutations
  const [verifyLockerPin, { isLoading: isVerifyingPin }] = useVerifyLockerPinMutation();
  const [setupLockPin, { isLoading: isSettingUpPin }] = useSetupLockPinMutation();
  const [verifyPasswordForReset, { isLoading: isVerifyingPassword }] =
    useVerifyPasswordForLockResetMutation();
  const [requestResetCode, { isLoading: isSendingOtp }] = useRequestLockPinResetCodeMutation();
  const [verifyResetOtp, { isLoading: isVerifyingOtp }] = useVerifyLockResetOtpMutation();
  const [resetLockPin, { isLoading: isResettingPin }] = useResetLockPinMutation();

  // Local PIN UI state
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockStep, setLockStep] = useState<
    | 'enter_pin'
    | 'setup_pin'
    | 'setup_confirm'
    | 'forgot_password'
    | 'forgot_otp'
    | 'forgot_new_pin'
  >('enter_pin');
  const [setupPinInput, setSetupPinInput] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [forgotPasswordInput, setForgotPasswordInput] = useState('');
  const [forgotOtpInput, setForgotOtpInput] = useState('');
  const [forgotNewPinInput, setForgotNewPinInput] = useState('');
  const [forgotNewPinConfirm, setForgotNewPinConfirm] = useState('');

  const resetLockUI = () => {
    setLockPinInput('');
    setSetupPinInput('');
    setSetupPinConfirm('');
    setForgotPasswordInput('');
    setForgotOtpInput('');
    setForgotNewPinInput('');
    setForgotNewPinConfirm('');
    setLockStep('enter_pin');
  };

  // Reset lock UI whenever active chat changes
  useEffect(() => {
    resetLockUI();
  }, [activeChat?.id]);

  const currentUserHasLockPin = !!(currentUser as any)?.hasLockPin;

  const handleLockerPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    try {
      const res = await verifyLockerPin({ pin: lockPinInput }).unwrap();
      if (res.success && res.data?.lockerToken) {
        dispatch(setLockerUnlocked({ unlocked: true, token: res.data.lockerToken }));
        resetLockUI();
        toast.success('Locker unlocked');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Invalid PIN');
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPinInput !== setupPinConfirm) return toast.error('PINs do not match');
    if (!/^\d{4,8}$/.test(setupPinInput)) return toast.error('PIN must be 4–8 digits');
    try {
      await setupLockPin({ pin: setupPinInput, chatId: activeChat?.id }).unwrap();
      toast.success('Chat Lock PIN created and chat locked');
      // Immediately verify pin to unlock for this session
      const res = await verifyLockerPin({ pin: setupPinInput }).unwrap();
      if (res.success && res.data?.lockerToken) {
        dispatch(setLockerUnlocked({ unlocked: true, token: res.data.lockerToken }));
      }
      resetLockUI();
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to set up PIN');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPasswordForReset({ password: forgotPasswordInput }).unwrap();
      await requestResetCode().unwrap();
      toast.success('Verification code sent to your email');
      setLockStep('forgot_otp');
    } catch (err: any) {
      toast.error(err.data?.error || 'Verification failed');
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyResetOtp({ otp: forgotOtpInput }).unwrap();
      toast.success('Code verified');
      setLockStep('forgot_new_pin');
    } catch (err: any) {
      toast.error(err.data?.error || 'Invalid code');
    }
  };

  const handleForgotNewPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPinInput !== forgotNewPinConfirm) return toast.error('PINs do not match');
    try {
      await resetLockPin({ newPin: forgotNewPinInput }).unwrap();
      toast.success('PIN reset successfully');
      // Auto-unlock for this session
      const res = await verifyLockerPin({ pin: forgotNewPinInput }).unwrap();
      if (res.success && res.data?.lockerToken) {
        dispatch(setLockerUnlocked({ unlocked: true, token: res.data.lockerToken }));
      }
      resetLockUI();
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to reset PIN');
    }
  };

  const [text, setText] = useState('');
  const [previewFiles, setPreviewFiles] = useState<SelectedMediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dragCounter = useRef(0);
  const createdBlobUrls = useRef<Set<string>>(new Set());

  const [isContactShareOpen, setIsContactShareOpen] = useState(false);
  const [contactToShare, setContactToShare] = useState<{
    userId: string;
    fullName: string;
    username: string;
    profilePhoto?: string;
  } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu]);

  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    | 'contact_info'
    | 'search'
    | 'shared_media'
    | 'group_info'
    | 'message_info'
    | 'ai_assistant'
    | null
  >(null);
  const [selectedInfoMessage, setSelectedInfoMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<Message | null>(null);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const panelWidth = useMemo(() => {
    if (windowWidth >= 1440) return 380;
    if (windowWidth >= 1200) return 340;
    if (windowWidth >= 992) return 320;
    return windowWidth;
  }, [windowWidth]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);

  const handleInputChange = (val: string) => {
    setText(val);
    if (!socket || !activeChat) return;

    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      socket.emit('typing', { chatId: activeChat.id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsCurrentlyTyping(false);
      socket.emit('typing', { chatId: activeChat.id, isTyping: false });
    }, 2000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const exitLockedChat = useExitLockedChat();

  useChatComposerFocus(messageInputRef, activeChat?.id, text, setText, activePanel, {
    showEmojiPicker,
    showGifPicker,
    isContactShareOpen,
    showAttachMenu,
    isRecording: audioRecorder.isRecording,
    isLocked,
    isBlocked: isBlockedByMe,
    disabled: isUploading || isLocked || isBlockedByMe,
  });

  const messages = messagesResponse?.data?.messages || [];
  const nextCursor = messagesResponse?.data?.nextCursor;

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    const firstItem = virtualItems[0];
    if (firstItem && firstItem.index === 0 && nextCursor && !isFetching) {
      setCursor(nextCursor);
    }
  }, [virtualItems, nextCursor, isFetching]);

  useEffect(() => {
    if (virtualizer.getTotalSize() > 0 && !cursor && previewFiles.length === 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer, previewFiles.length, cursor]);

  const participantsMap = useMemo(() => {
    const map = new Map();
    activeChat?.participants.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [activeChat]);

  const handleScrollToMessage = useCallback(
    (messageId: string) => {
      console.log('[ChatArea] handleScrollToMessage invoked for:', messageId);
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        virtualizer.scrollToIndex(idx, { align: 'center' });
        setTimeout(() => {
          const el = document.getElementById(`msg-${messageId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('animate-highlight');
            void el.offsetWidth;
            el.classList.add('animate-highlight');
            setTimeout(() => el.classList.remove('animate-highlight'), 2000);
          }
        }, 100);
      }
    },
    [messages, virtualizer]
  );

  useEffect(() => {
    setCursor(undefined);
    setText('');
    setPreviewFiles([]);
    createdBlobUrls.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    createdBlobUrls.current.clear();
    setShowMenu(false);
    setReplyingMessage(null);
    setForwardingMessage(null);
    setIsForwardModalOpen(false);
    setIsCurrentlyTyping(false);
    setActivePanel(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [activeChat?.id]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleFilesAdded = async (fileList: FileList | File[] | DataTransferItemList) => {
    const filesArray: File[] = [];
    if (fileList instanceof FileList || Array.isArray(fileList)) {
      for (let i = 0; i < fileList.length; i++) {
        const item = fileList[i];
        if (item instanceof File) {
          filesArray.push(item);
        }
      }
    } else if (fileList instanceof DataTransferItemList) {
      for (let i = 0; i < fileList.length; i++) {
        if (fileList[i].kind === 'file') {
          const file = fileList[i].getAsFile();
          if (file) filesArray.push(file);
        }
      }
    }

    if (!filesArray.length) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
    const validFiles: File[] = [];
    for (const file of filesArray) {
      if (file.size === 0) {
        toast.error(`${file.name} is empty (0 bytes)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 50MB size limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    const newFiles: SelectedMediaFile[] = [];
    for (const file of validFiles) {
      const id = Math.random().toString(36).substring(7);
      let type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
      let preview = 'document';
      let thumbnailUrl: string | undefined = undefined;
      let pageCount: number | undefined = undefined;

      if (file.type.startsWith('image/')) {
        type = 'IMAGE';
        preview = URL.createObjectURL(file);
        createdBlobUrls.current.add(preview);
      } else if (file.type.startsWith('video/')) {
        type = 'VIDEO';
        preview = URL.createObjectURL(file);
        createdBlobUrls.current.add(preview);
        try {
          thumbnailUrl = await generateVideoThumbnail(file);
        } catch (e) {
          console.error('Failed to generate video thumbnail:', e);
        }
      } else if (file.type.startsWith('audio/')) {
        type = 'AUDIO';
        preview = URL.createObjectURL(file);
        createdBlobUrls.current.add(preview);
      } else {
        type = 'DOCUMENT';
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          try {
            pageCount = await getPdfPageCount(file);
          } catch (e) {
            console.error('Failed to get PDF page count:', e);
          }
        }
      }

      newFiles.push({
        id,
        file,
        preview,
        type,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        caption: '',
        thumbnailUrl,
        pageCount,
      });
    }

    setPreviewFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemovePreviewFile = (id: string) => {
    setPreviewFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview);
        createdBlobUrls.current.delete(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearPreviewFiles = () => {
    previewFiles.forEach((f) => {
      if (f.preview && f.preview.startsWith('blob:')) {
        URL.revokeObjectURL(f.preview);
      }
    });
    createdBlobUrls.current.clear();
    setPreviewFiles([]);
  };

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      createdBlobUrls.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      createdBlobUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        handleFilesAdded(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      if (window.innerWidth < 768) return;
      if (previewFiles.length > 0) return; // Skip if already previewing
      if (e.dataTransfer) {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes('Files')) {
          e.preventDefault();
          e.stopPropagation();
          dragCounter.current++;
          if (dragCounter.current === 1) {
            setIsDragging(true);
          }
        }
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      if (window.innerWidth < 768) return;
      if (previewFiles.length > 0) return;
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      if (window.innerWidth < 768) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      if (window.innerWidth < 768) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFilesAdded(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [activeChat?.id, previewFiles.length]);

  if (!activeChat || !currentUser) return null;

  const isTyping = typingUsers[activeChat.id];

  let chatStatus = '';
  if (isTyping && !isBlocked) chatStatus = 'typing...';
  else if (isGroup) chatStatus = `${activeChat.participants.length} participants`;
  else if (otherUser && !isBlocked)
    chatStatus = otherUser.status === 'ONLINE' ? 'Online' : 'Offline';

  const chatName = isGroup
    ? activeChat.groupMetadata?.name
    : getContactName(otherUser?.id || (otherUser as any)?._id, otherUser);
  const chatAvatar = isGroup ? activeChat.groupMetadata?.avatarUrl : otherUser?.avatarUrl;
  const isMuted = currentUser.mutedChats?.includes(activeChat.id) || false;
  const isOnline = !isGroup && otherUser?.status === 'ONLINE' && !isBlocked;

  const handleToggleMute = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/chats/${activeChat.id}/mute`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success && token) {
        dispatch(
          setCredentials({
            user: { ...currentUser, mutedChats: data.data.mutedChats },
            accessToken: token,
          })
        );
        toast.success(data.data.isMuted ? 'Chat muted' : 'Chat unmuted');
      }
    } catch (error) {
      toast.error('Failed to toggle mute');
    }
    setShowMenu(false);
  };

  const handleToggleBlock = async () => {
    if (!otherUser) return;
    try {
      if (isBlockedByMe) {
        await unblockUser(otherUser.id).unwrap();
        toast.success(`${chatName} unblocked`);
      } else {
        await blockUser(otherUser.id).unwrap();
        toast.success(`${chatName} blocked`);
      }
    } catch (e) {
      toast.error('Action failed');
    }
    setShowMenu(false);
  };

  const handleGifSelect = async (gif: GifEntry) => {
    if (!activeChat) return;
    sendMessage(activeChat.id, '', 'GIF', undefined, undefined, undefined, undefined, gif.id);
    setShowGifPicker(false);
    try {
      await recordGifUsage(gif.id).unwrap();
    } catch (e) {
      console.error('Failed to record GIF usage:', e);
    }
  };

  const uploadFileWithProgress = (
    file: File,
    onProgress: (progress: number) => void,
    retryCount = 0
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_API_URL || ''}/api/v1/media/upload`, true);
      const currentToken = tokenRef.current;
      if (currentToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else if (xhr.status === 401 && retryCount < 1) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            try {
              const retryRes = await uploadFileWithProgress(file, onProgress, retryCount + 1);
              resolve(retryRes);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('Unauthorized'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  };

  const handleSendMediaBatch = async (
    filesToSend: { file: File; type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'; caption: string }[],
    onProgress: (index: number, progress: number) => void
  ) => {
    let currentReplyTo = replyingMessage?.id;
    for (let i = 0; i < filesToSend.length; i++) {
      const item = filesToSend[i];
      try {
        const res = await uploadFileWithProgress(item.file, (prog) => onProgress(i, prog));
        if (res.success && res.data) {
          sendMessage(activeChat.id, item.caption.trim(), item.type, res.data, currentReplyTo);
          currentReplyTo = undefined;
        }
      } catch (err) {
        console.error('Failed to send media file:', item.file.name, err);
        toast.error(`Failed to send ${item.file.name}`);
      }
    }
    setReplyingMessage(null);
    setPreviewFiles([]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Reset pickers
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    if (previewFiles.length > 0) {
      const filesToSend = previewFiles.map((f, i) => ({
        file: f.file,
        type: f.type,
        caption: i === 0 ? text.trim() : '',
      }));

      const currentReplyTo = replyingMessage?.id;

      // Clear inputs immediately to keep UI non-blocking and instant
      setText('');
      setPreviewFiles([]);
      setReplyingMessage(null);

      // Start background upload process
      (async () => {
        setIsUploading(true);
        try {
          for (let i = 0; i < filesToSend.length; i++) {
            const item = filesToSend[i];
            const tempId = Math.random().toString(36).substring(7);
            const objectUrl = URL.createObjectURL(item.file);
            createdBlobUrls.current.add(objectUrl);

            // Send optimistic message immediately using the local blob URL
            sendMessage(
              activeChat.id,
              item.caption,
              item.type,
              {
                url: objectUrl,
                publicId: '',
                mimeType: item.file.type,
                size: item.file.size,
                name: item.file.name,
              },
              i === 0 ? currentReplyTo : undefined,
              false,
              undefined,
              undefined,
              tempId
            );

            // Upload in background
            try {
              const res = await uploadFileWithProgress(item.file, () => {});
              if (res.success && res.data) {
                // Emit final socket message with Cloudinary metadata matching the tempId
                if (socket) {
                  socket.emit('send_message', {
                    chatId: activeChat.id,
                    content: item.caption,
                    type: item.type,
                    media: res.data,
                    replyTo: i === 0 ? currentReplyTo : undefined,
                    clientId: tempId,
                  });
                }
              }
            } catch (uploadErr) {
              console.error('Background upload failed for:', item.file.name, uploadErr);
              toast.error(`Failed to send ${item.file.name}`);
            }
          }
        } finally {
          setIsUploading(false);
        }
      })();
      return;
    }

    if (!text.trim()) return;

    sendMessage(activeChat.id, text.trim(), 'TEXT', undefined, replyingMessage?.id);
    setText('');
    setReplyingMessage(null);
  };

  const handleShareContact = (sharedContact: any, recipientChatIds: string[]) => {
    recipientChatIds.forEach((chatId) => {
      sendMessage(
        chatId,
        `Shared contact: ${sharedContact.fullName}`,
        'CONTACT',
        undefined,
        undefined,
        false,
        sharedContact
      );
    });
    toast.success('Contact shared!');
  };

  const handleOpenShareContactFromPanel = () => {
    if (!otherUser) return;
    setContactToShare({
      userId: otherUser.id,
      fullName: getContactName(otherUser.id || (otherUser as any)._id, otherUser),
      username: otherUser.username,
      profilePhoto: otherUser.avatarUrl || otherUser.profilePhoto,
    });
    setIsContactShareOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleSendVoiceNote = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioFile);
      const res = await uploadMedia(formData).unwrap();
      if (res.success && res.data) sendMessage(activeChat.id, '', 'AUDIO', res.data);
    } catch (err) {
      toast.error('Failed to send voice note');
    } finally {
      setIsUploading(false);
      audioRecorder.clearAudio();
    }
  };

  return (
    <div className="flex flex-row h-full w-full bg-chat-area overflow-hidden relative z-10">
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 bg-background/60 z-50 flex flex-col items-center justify-center border-2 border-dashed border-secondary/50 rounded-2xl m-3 pointer-events-none"
            >
              <div className="bg-card border border-white/10 p-8 rounded-2xl shadow-neo-out-md flex flex-col items-center max-w-sm text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mb-4 text-secondary animate-bounce shadow-neo-out-sm">
                  <Send className="w-8 h-8 rotate-[-45deg] translate-x-0.5 -translate-y-0.5" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  Drop files to preview and send
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  Drag one or more files here.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Images', 'Videos', 'Audio', 'PDFs', 'Docs', 'ZIPs'].map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold bg-composer px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5 text-text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <header className="flex items-center justify-between px-5 md:px-7 py-3 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0 z-10">
          <div
            className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
            onClick={() => setActivePanel(isGroup ? 'group_info' : 'contact_info')}
          >
            <IconButton
              label="Back"
              onClick={onBack}
              className="flex md:hidden w-9 h-9 -ml-1.5 bg-transparent border-none"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </IconButton>

            <Avatar
              src={chatAvatar}
              fallback={chatName || '?'}
              size="md"
              className="ring-offset-background hover:ring-secondary/20"
            />
            <div className="flex-grow min-w-0 leading-tight">
              <h3 className="text-text-primary font-bold tracking-tight truncate flex items-center gap-2 text-[15px]">
                {chatName}
                {isMuted && <BellOff className="w-3.5 h-3.5 text-text-muted opacity-70" />}
              </h3>
              <span
                className={`text-[11px] mt-0.5 block truncate font-medium ${isTyping ? 'text-secondary animate-pulse' : 'text-text-muted opacity-75'}`}
              >
                {chatStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 relative">
            {!isGroup && !isBlocked && (
              <>
                <IconButton
                  label="Voice Call"
                  onClick={() => dispatch(initiateCall({ remoteUser: otherUser!, type: 'AUDIO' }))}
                  className="w-9.5 h-9.5 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary"
                >
                  <Phone className="w-4.5 h-4.5" />
                </IconButton>
                <IconButton
                  label="Video Call"
                  onClick={() => dispatch(initiateCall({ remoteUser: otherUser!, type: 'VIDEO' }))}
                  className="w-9.5 h-9.5 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary"
                >
                  <VideoIcon className="w-4.5 h-4.5" />
                </IconButton>
                <div className="w-px h-5.5 bg-black/5 dark:bg-white/5 mx-1" />
              </>
            )}

            <div className="relative" ref={menuRef}>
              <IconButton
                label="Menu"
                onClick={() => setShowMenu(!showMenu)}
                className="w-9.5 h-9.5 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary"
              >
                <MoreVertical className="w-4.5 h-4.5" />
              </IconButton>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                    className="absolute top-full right-0 mt-2.5 w-52 bg-card border border-white/20 rounded-2xl shadow-neo-out-md z-50 overflow-hidden py-1.5"
                  >
                    <button
                      onClick={handleToggleMute}
                      className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      {isMuted ? (
                        <Bell className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <BellOff className="w-4 h-4 text-text-secondary" />
                      )}
                      {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                    </button>
                    <button
                      onClick={() => {
                        setActivePanel(isGroup ? 'group_info' : 'contact_info');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <Users className="w-4 h-4 text-text-secondary" />
                      Chat details
                    </button>
                    <button
                      onClick={() => {
                        setActivePanel('search');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <SearchIcon className="w-4 h-4 text-text-secondary" />
                      Search messages
                    </button>
                    <button
                      onClick={() => {
                        setActivePanel('shared_media');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <Paperclip className="w-4 h-4 text-text-secondary" />
                      Shared media
                    </button>
                    <button
                      onClick={() => {
                        setActivePanel('ai_assistant');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4.5 py-2.5 text-sm font-semibold text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <Sparkles className="w-4 h-4 text-secondary" />
                      AI Assistant
                    </button>
                    {(activeChat as any).isLocked && (
                      <button
                        onClick={() => {
                          exitLockedChat(activeChat.id);
                          toast.success('Chat Locked');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4.5 py-2.5 text-sm text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3 font-semibold"
                      >
                        <Lock className="w-4 h-4" />
                        Exit Locked Chat
                      </button>
                    )}
                    {!isGroup && (
                      <>
                        <div className="h-px bg-black/5 dark:bg-white/5 mx-3.5 my-1.5" />
                        <button
                          onClick={handleToggleBlock}
                          className="w-full text-left px-4.5 py-2.5 text-sm font-semibold text-error hover:bg-error/5 transition-colors flex items-center gap-3"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          {isBlockedByMe ? 'Unblock contact' : 'Block contact'}
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {isLocked ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-gradient-mesh">
            <div className="w-full max-w-sm bg-card rounded-3xl p-8 border border-white/20 shadow-neo-out-lg">
              {/* Lock Icon + Title */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-18 h-18 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center justify-center mb-4 shadow-neo-out-sm">
                  <svg
                    className="w-9 h-9 text-primary-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-text-primary mb-1">
                  {lockStep === 'setup_pin' || lockStep === 'setup_confirm'
                    ? 'Set Up Vault Lock'
                    : lockStep === 'forgot_password'
                      ? 'Verify Password'
                      : lockStep === 'forgot_otp'
                        ? 'Enter OTP'
                        : lockStep === 'forgot_new_pin'
                          ? 'New Vault PIN'
                          : 'Vault Locked'}
                </h2>
                <p className="text-xs font-medium text-text-secondary text-center leading-relaxed">
                  {lockStep === 'setup_pin'
                    ? 'Enter a 4–8 digit secure PIN to lock this chat.'
                    : lockStep === 'setup_confirm'
                      ? 'Confirm your secure PIN.'
                      : lockStep === 'forgot_password'
                        ? 'Enter your password to verify ownership.'
                        : lockStep === 'forgot_otp'
                          ? 'Enter the verification code sent to your email.'
                          : lockStep === 'forgot_new_pin'
                            ? 'Choose a new Vault lock PIN.'
                            : 'This conversation is secured under Zira Vault.'}
                </p>
              </div>

              {/* ─── Enter Existing PIN ─── */}
              {lockStep === 'enter_pin' && (
                <form onSubmit={handleLockerPinSubmit} className="space-y-4">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={lockPinInput}
                    onChange={(e) => setLockPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={lockPinInput.length < 4 || isVerifyingPin}
                  >
                    {isVerifyingPin ? 'Verifying…' : 'Unlock'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setLockStep('forgot_password')}
                      className="text-xs text-primary-500 hover:underline font-medium"
                    >
                      Forgot PIN?
                    </button>
                  </div>
                </form>
              )}

              {/* ─── First-time Setup: Enter PIN ─── */}
              {lockStep === 'setup_pin' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (setupPinInput.length >= 4) setLockStep('setup_confirm');
                  }}
                  className="space-y-4"
                >
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={setupPinInput}
                    onChange={(e) => setSetupPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Choose a PIN (4–8 digits)"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <Button type="submit" className="w-full" disabled={setupPinInput.length < 4}>
                    Continue
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setLockStep('enter_pin')}
                      className="text-xs text-text-muted hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ─── First-time Setup: Confirm PIN ─── */}
              {lockStep === 'setup_confirm' && (
                <form onSubmit={handleSetupPinSubmit} className="space-y-4">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={setupPinConfirm}
                    onChange={(e) => setSetupPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirm PIN"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={setupPinConfirm.length < 4 || isSettingUpPin}
                  >
                    {isSettingUpPin ? 'Setting up…' : 'Activate Chat Lock'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setLockStep('setup_pin')}
                      className="text-xs text-text-muted hover:underline"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* ─── Forgot: Verify Account Password ─── */}
              {lockStep === 'forgot_password' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <Input
                    type="password"
                    value={forgotPasswordInput}
                    onChange={(e) => setForgotPasswordInput(e.target.value)}
                    placeholder="Account password"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!forgotPasswordInput || isVerifyingPassword || isSendingOtp}
                  >
                    {isVerifyingPassword || isSendingOtp
                      ? 'Please wait…'
                      : 'Send Verification Code'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setLockStep('enter_pin')}
                      className="text-xs text-text-muted hover:underline"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* ─── Forgot: Enter OTP ─── */}
              {lockStep === 'forgot_otp' && (
                <form onSubmit={handleForgotOtpSubmit} className="space-y-4">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotOtpInput}
                    onChange={(e) => setForgotOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotOtpInput.length !== 6 || isVerifyingOtp}
                  >
                    {isVerifyingOtp ? 'Verifying…' : 'Verify Code'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setLockStep('forgot_password')}
                      className="text-xs text-text-muted hover:underline"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* ─── Forgot: Set New PIN ─── */}
              {lockStep === 'forgot_new_pin' && (
                <form onSubmit={handleForgotNewPinSubmit} className="space-y-4">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={forgotNewPinInput}
                    onChange={(e) => setForgotNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="New PIN (4–8 digits)"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={forgotNewPinConfirm}
                    onChange={(e) => setForgotNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirm new PIN"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotNewPinInput.length < 4 || isResettingPin}
                  >
                    {isResettingPin ? 'Resetting…' : 'Reset PIN & Unlock'}
                  </Button>
                </form>
              )}

              {/* ─── If no PIN set yet, offer setup ─── */}
              {lockStep === 'enter_pin' && !currentUserHasLockPin && (
                <div className="mt-4 p-3 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-text-muted mb-2">No Chat Lock PIN configured yet.</p>
                  <button
                    type="button"
                    onClick={() => setLockStep('setup_pin')}
                    className="text-xs font-semibold text-primary-500 hover:underline"
                  >
                    Set up Chat Lock PIN
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              ref={parentRef}
              className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 bg-background relative"
            >
              {isLoadingMessages && !messages.length ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualItems.map((virtualItem) => {
                    const message = messages[virtualItem.index];
                    const isOwnMessage = message.senderId === currentUser.id;
                    const prevMessage = messages[virtualItem.index - 1];
                    const showSenderName =
                      isGroup &&
                      !isOwnMessage &&
                      (!prevMessage || prevMessage.senderId !== message.senderId);

                    return (
                      <div
                        key={message.id}
                        ref={virtualizer.measureElement}
                        data-index={virtualItem.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <MessageBubble
                          message={message}
                          isOwnMessage={isOwnMessage}
                          showSenderName={showSenderName}
                          sender={participantsMap.get(message.senderId)}
                          onReply={(msg) => setReplyingMessage(msg)}
                          onForward={(msg) => {
                            setForwardingMessage(msg);
                            setIsForwardModalOpen(true);
                          }}
                          onScrollToMessage={handleScrollToMessage}
                          onMediaClick={(msg) => setPreviewMessage(msg)}
                          onInfoClick={(msg) => {
                            if (msg.senderId === currentUser?.id) {
                              setSelectedInfoMessage(msg);
                              setActivePanel('message_info');
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 md:px-7 py-4.5 bg-surface/90 dark:bg-surface/90 border-t border-border shrink-0 min-h-[70px] flex flex-col justify-center relative backdrop-blur-md">
              {replyingMessage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex justify-between items-center bg-brand-indigo/5 border-l-3 border-brand-indigo p-3.5 mb-3.5 rounded-r-2xl text-xs text-text-primary"
                >
                  <div className="flex-1 overflow-hidden">
                    <span className="font-bold text-brand-indigo block text-[10px] uppercase tracking-wider">
                      Replying to{' '}
                      {replyingMessage.senderId === currentUser.id
                        ? 'yourself'
                        : getContactName(
                            replyingMessage.senderId,
                            participantsMap.get(replyingMessage.senderId)
                          )}
                    </span>
                    <p className="truncate text-xs text-text-secondary mt-0.5 font-medium">
                      {replyingMessage.type === 'IMAGE' && '📷 Photo'}
                      {replyingMessage.type === 'VIDEO' && '🎥 Video'}
                      {replyingMessage.type === 'AUDIO' && '🎵 Audio'}
                      {replyingMessage.type === 'DOCUMENT' && '📄 Document'}
                      {replyingMessage.type === 'GIF' && '🎬 GIF'}
                      {replyingMessage.type === 'TEXT' && replyingMessage.content}
                    </p>
                  </div>
                  <IconButton
                    label="Cancel reply"
                    onClick={() => setReplyingMessage(null)}
                    className="w-8 h-8 bg-transparent hover:shadow-neo-out-sm border-none"
                  >
                    <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                  </IconButton>
                </motion.div>
              )}

              {/* GIF Picker (above composer) */}
              <GifPicker
                isOpen={showGifPicker}
                onClose={() => setShowGifPicker(false)}
                onSelect={handleGifSelect}
              />

              {isBlockedByMe ? (
                <div className="flex flex-col items-center justify-center py-5 bg-error/5 border border-error/15 rounded-2xl text-text-secondary text-sm gap-2.5 text-center px-6 mx-2 mb-2.5">
                  <ShieldAlert className="w-5.5 h-5.5 text-error shrink-0" />
                  <span className="font-bold text-text-primary">You blocked this contact</span>
                  <span className="text-xs">Unblock this contact to start sending messages.</span>
                  <button
                    onClick={handleToggleBlock}
                    className="mt-1 px-4.5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all duration-300 text-xs shadow-sm hover:shadow"
                  >
                    Unblock Contact
                  </button>
                </div>
              ) : isBlockedByOther ? (
                <div className="flex flex-col items-center justify-center py-5 bg-card border border-white/20 shadow-neo-out-sm rounded-2xl text-text-secondary text-sm gap-1.5 text-center px-6 mx-2 mb-2.5">
                  <ShieldAlert className="w-5.5 h-5.5 text-text-muted shrink-0 opacity-70" />
                  <span className="font-bold text-text-primary">This contact is unavailable</span>
                  <span className="text-xs font-medium">
                    You cannot send messages to this conversation.
                  </span>
                </div>
              ) : audioRecorder.isRecording || audioRecorder.audioBlob ? (
                <VoiceRecorder
                  isRecording={audioRecorder.isRecording}
                  recordingTime={audioRecorder.recordingTime}
                  audioBlob={audioRecorder.audioBlob}
                  onStart={audioRecorder.startRecording}
                  onStop={audioRecorder.stopRecording}
                  onCancel={audioRecorder.cancelRecording}
                  onSend={handleSendVoiceNote}
                  getAnalyserData={audioRecorder.getAnalyserData}
                />
              ) : (
                <form onSubmit={handleSend} className="flex items-center gap-2.5 md:gap-3.5 w-full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt"
                  />
                  <div className="relative" ref={attachMenuRef}>
                    <IconButton
                      label="Attach"
                      type="button"
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className={cn(
                        'w-10 h-10 shrink-0 bg-transparent border border-black/5 dark:border-white/5 hover:shadow-neo-out-sm rounded-xl transition-all',
                        showAttachMenu && 'shadow-neo-in-sm'
                      )}
                    >
                      <Paperclip className="w-5 h-5 text-text-secondary" />
                    </IconButton>

                    <AnimatePresence>
                      {showAttachMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 8 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                          className="absolute bottom-full left-0 mb-3.5 w-48 bg-card rounded-2xl shadow-neo-out-md z-50 overflow-hidden py-1.5 border border-white/20"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowAttachMenu(false);
                            }}
                            className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                          >
                            <FileText className="w-4 h-4 text-text-secondary" />
                            File or Media
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              console.log(
                                '[AttachMenu] Clicked Share Contact button. Setting isContactShareOpen to true.'
                              );
                              setIsContactShareOpen(true);
                              setShowAttachMenu(false);
                            }}
                            className="w-full text-left px-4.5 py-2.5 text-sm font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                          >
                            <Users className="w-4 h-4 text-text-secondary" />
                            Share Contact
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-grow relative flex items-center">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={text}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full text-text-primary bg-composer pl-4.5 pr-22 py-3 rounded-xl neo-in-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-sm placeholder:text-text-muted/50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <IconButton
                        label="Emoji"
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowGifPicker(false);
                        }}
                        className="w-8.5 h-8.5 bg-transparent hover:shadow-neo-out-sm border-none"
                      >
                        <Smile className="w-[19px] h-[19px] text-text-muted hover:text-text-primary transition-colors" />
                      </IconButton>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGifPicker(!showGifPicker);
                          setShowEmojiPicker(false);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-extrabold text-text-muted hover:text-text-primary hover:shadow-neo-out-sm transition-all mr-1 uppercase tracking-wider"
                      >
                        GIF
                      </button>
                    </div>
                  </div>

                  {text.trim() || previewFiles.length > 0 ? (
                    <IconButton
                      label="Send message"
                      type="submit"
                      disabled={isUploading}
                      className="neo-btn neo-btn-primary w-10.5 h-10.5 rounded-xl disabled:opacity-40 shrink-0 flex items-center justify-center border border-white/10"
                    >
                      {isUploading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4.5 h-4.5 ml-0.5 text-white" />
                      )}
                    </IconButton>
                  ) : (
                    <VoiceRecorder
                      isRecording={false}
                      recordingTime={0}
                      audioBlob={null}
                      onStart={audioRecorder.startRecording}
                      onStop={audioRecorder.stopRecording}
                      onCancel={audioRecorder.cancelRecording}
                      onSend={handleSendVoiceNote}
                      getAnalyserData={audioRecorder.getAnalyserData}
                    />
                  )}
                </form>
              )}

              {/* Emoji Picker (below composer) */}
              {showEmojiPicker && (
                <div className="border border-white/20 bg-card p-3 mt-3.5 rounded-2xl grid grid-cols-8 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-2 duration-300 shadow-neo-out-md">
                  {[
                    '😀',
                    '😃',
                    '😄',
                    '😁',
                    '😆',
                    '😅',
                    '😂',
                    '🤣',
                    '😊',
                    '😇',
                    '🙂',
                    '🙃',
                    '😉',
                    '😌',
                    '😍',
                    '🥰',
                    '😘',
                    '😗',
                    '😙',
                    '😚',
                    '😋',
                    '😛',
                    '😝',
                    '😜',
                    '🤪',
                    '🤨',
                    '🧐',
                    '🤓',
                    '😎',
                    '🤩',
                    '🥳',
                    '😏',
                    '😒',
                    '😞',
                    '😔',
                    '😟',
                    '😕',
                    '🙁',
                    '☹️',
                    '😣',
                    '😖',
                    '😫',
                    '😩',
                    '🥺',
                    '😢',
                    '😭',
                    '😤',
                    '😠',
                    '😡',
                    '🤬',
                    '🤯',
                    '😳',
                    '🥵',
                    '🥶',
                    '😱',
                    '😨',
                    '😰',
                    '😥',
                    '😓',
                    '🤗',
                    '🤔',
                    '🤭',
                    '🤫',
                    '🤥',
                    '😶',
                    '😐',
                    '😑',
                    '😬',
                    '🙄',
                    '😯',
                    '😦',
                    '😧',
                    '😮',
                    '😲',
                    '🥱',
                    '😴',
                    '🤤',
                    '😪',
                    '😵',
                    '🤐',
                    '😵',
                    '🤢',
                    '🤮',
                    '🤧',
                    '😷',
                    '🤒',
                    '🤕',
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setText((prev) => prev + emoji);
                      }}
                      className="w-8.5 h-8.5 flex items-center justify-center hover:shadow-neo-out-sm rounded-xl text-lg transition-colors duration-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Side Panels Container */}
      <AnimatePresence mode="popLayout">
        {activePanel && (
          <motion.div
            key={activePanel}
            initial={{ width: 0, opacity: 0, x: 30 }}
            animate={{ width: panelWidth, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-surface shrink-0 overflow-hidden relative border-l border-border"
          >
            {activePanel === 'contact_info' && (
              <ContactDetailsPanel
                isOpen={true}
                onClose={() => setActivePanel(null)}
                onShareContact={handleOpenShareContactFromPanel}
              />
            )}
            {activePanel === 'group_info' && (
              <GroupDetailsPanel isOpen={true} onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'search' && (
              <SearchMessagesPanel
                onClose={() => setActivePanel(null)}
                messages={messages}
                onScrollToMessage={handleScrollToMessage}
                getContactName={(id) => getContactName(id, participantsMap.get(id))}
              />
            )}
            {activePanel === 'shared_media' && (
              <ContactDetailsPanel
                isOpen={true}
                onClose={() => setActivePanel(null)}
                onShareContact={handleOpenShareContactFromPanel}
              />
            )}
            {activePanel === 'message_info' && selectedInfoMessage && (
              <MessageInfoPanel
                onClose={() => {
                  setActivePanel(null);
                  setSelectedInfoMessage(null);
                }}
                message={selectedInfoMessage}
                getContactName={(id) => getContactName(id, participantsMap.get(id))}
              />
            )}
            {activePanel === 'ai_assistant' && (
              <AIAssistantPanel onClose={() => setActivePanel(null)} chatName={chatName} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isForwardModalOpen && forwardingMessage && (
        <Dialog
          isOpen={isForwardModalOpen}
          onClose={() => {
            setIsForwardModalOpen(false);
            setForwardingMessage(null);
          }}
          title="Forward Message"
          className="max-w-md"
        >
          <div className="flex flex-col h-[350px]">
            <div className="p-3 bg-surface-hover border border-border rounded-xl mb-4 text-sm text-text-secondary truncate">
              <span className="font-semibold block text-xs text-text-muted mb-0.5">
                Message to forward
              </span>
              {forwardingMessage.content || `[${forwardingMessage.type}]`}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {chatsList.map((chat: any) => {
                let chatName = '';
                if (chat.type === 'GROUP') {
                  chatName = chat.groupMetadata?.name || 'Group Chat';
                } else {
                  const other = chat.participants.find((p: any) => p.id !== currentUser.id);
                  chatName =
                    getContactName(other?.id || (other as any)?._id, other) || 'Direct Chat';
                }
                return (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-2.5 hover:bg-surface-hover rounded-xl transition-colors"
                  >
                    <span className="text-sm font-medium text-text-primary">{chatName}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        sendMessage(
                          chat.id,
                          forwardingMessage.content,
                          forwardingMessage.type,
                          forwardingMessage.media,
                          undefined,
                          true,
                          undefined,
                          forwardingMessage.gifId
                        );
                        toast.success('Message forwarded');
                        setIsForwardModalOpen(false);
                        setForwardingMessage(null);
                      }}
                    >
                      Send
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}

      {previewMessage && (
        <MediaPreviewModal
          key={`${activeChat?.id}-${previewMessage.id}`}
          isOpen={!!previewMessage}
          onClose={() => setPreviewMessage(null)}
          message={previewMessage}
          allMessages={messages}
          onNavigate={(msg) => setPreviewMessage(msg)}
          participants={activeChat?.participants || []}
        />
      )}

      {isContactShareOpen && (
        <ContactShareModal
          isOpen={isContactShareOpen}
          onClose={() => {
            setIsContactShareOpen(false);
            setContactToShare(null);
          }}
          onShare={handleShareContact}
          defaultRecipientChatId={contactToShare ? undefined : activeChat.id}
          initialContactToShare={contactToShare}
        />
      )}

      {previewFiles.length > 0 && (
        <MediaSendPreview
          files={previewFiles}
          participants={activeChat.participants}
          onClose={handleClearPreviewFiles}
          onSend={async (filesToSend, onProgress) => {
            setIsUploading(true);
            await handleSendMediaBatch(filesToSend, onProgress);
            setIsUploading(false);
          }}
          onAddMore={(fileList) => handleFilesAdded(fileList)}
          onRemove={handleRemovePreviewFile}
          onClearAll={handleClearPreviewFiles}
          onReorder={(newFiles) => setPreviewFiles(newFiles)}
        />
      )}
    </div>
  );
};
