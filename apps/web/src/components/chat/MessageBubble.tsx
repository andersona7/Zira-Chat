import React, { memo, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { cn } from '@zira/utils';
import type { Message, User } from '@zira/types';
import {
  FileText,
  Download,
  Reply,
  Forward,
  Star,
  Pin,
  Info,
  Trash,
  MoreVertical,
  Play,
  UserPlus,
  UserCheck,
  Share2,
} from 'lucide-react';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { SecureMedia } from '../common/SecureMedia';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useContactNames } from '@/hooks/useContactNames';
import { useSocket } from '@/hooks/useSocket';
import { IconButton, Dialog, Avatar, Button } from '@zira/ui';
import { useGetContactsQuery } from '@/store/api/contactApi';
import { AddContactModal } from '../contacts/AddContactModal';
import { GifImage, GIF_LIBRARY } from '@/modules/gif';
import { formatMessageInfoTimestamp } from '@/utils/formatTimestamp';

const ContactCard: React.FC<{
  sharedContact: { userId: string; fullName: string; username: string; profilePhoto?: string };
  isOwnMessage: boolean;
  onAddContactClick: () => void;
}> = ({ sharedContact, isOwnMessage, onAddContactClick }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: contactsData } = useGetContactsQuery();
  const contacts = contactsData?.data || [];

  const isSaved = useMemo(() => {
    if (!contacts) return false;
    return contacts.some(
      (c) => c.contactUser.username.toLowerCase() === sharedContact.username.toLowerCase()
    );
  }, [contacts, sharedContact.username]);

  const isSelf = currentUser?.username.toLowerCase() === sharedContact.username.toLowerCase();

  return (
    <div className="my-2 p-4 rounded-2xl bg-card border border-white/25 shadow-neo-out-sm w-full max-w-[280px] flex flex-col items-center gap-4 transition-all hover:shadow-neo-out-md hover:border-secondary/30">
      <div className="relative">
        <SecureMedia
          type="avatar"
          src={sharedContact.profilePhoto}
          fallback={sharedContact.fullName || sharedContact.username}
          size="lg"
          className="w-20 h-20 shadow-neo-out-sm border border-white/10"
        />
        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-secondary to-primary text-white rounded-full p-1 border-2 border-white/20 shadow-neo-out-sm">
          <Share2 className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="text-center w-full min-w-0">
        <span className="text-[10px] font-semibold text-primary-500 uppercase tracking-widest block mb-0.5">
          Shared Contact
        </span>
        <h4 className="font-semibold text-text-primary text-base truncate px-1">
          {sharedContact.fullName}
        </h4>
        <p className="text-xs text-text-muted truncate">@{sharedContact.username}</p>
      </div>

      <div className="w-full pt-3 border-t border-border/40">
        {isSelf ? (
          <div className="text-xs text-text-muted text-center py-2 font-medium">You</div>
        ) : isSaved ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-500 font-semibold py-2 bg-emerald-500/10 rounded-xl select-none animate-in fade-in zoom-in duration-200">
            <UserCheck className="w-4 h-4" />
            <span>Already in Contacts</span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onAddContactClick}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl text-xs py-2 bg-primary-500 text-white hover:bg-primary-600 shadow-sm animate-in fade-in duration-200"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Contact
          </Button>
        )}
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean;
  sender?: User;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  onMediaClick?: (message: Message) => void;
  onInfoClick?: (message: Message) => void;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showSenderName,
  sender,
  onReply,
  onForward,
  onScrollToMessage,
  onMediaClick,
  onInfoClick,
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const { getContactName } = useContactNames();
  const { socket } = useSocket();

  const handleDownload = async (e: React.MouseEvent, mediaIdOrUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let mediaId = mediaIdOrUrl;
      if (mediaIdOrUrl.startsWith('http') && mediaIdOrUrl.includes('cloudinary.com')) {
        const parts = mediaIdOrUrl.split('/upload/');
        if (parts.length >= 2) {
          const pathParts = parts[1].split('/');
          if (pathParts[0].startsWith('v')) {
            pathParts.shift();
          }
          const fullId = pathParts.join('/');
          const lastDot = fullId.lastIndexOf('.');
          mediaId = lastDot === -1 ? fullId : fullId.substring(0, lastDot);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/media/download/${encodeURIComponent(mediaId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Download failed');
      const resData = await response.json();
      if (resData.success && resData.url) {
        const a = document.createElement('a');
        a.href = resData.url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isImage = message.type === 'IMAGE' && message.media;
  const isVideo = message.type === 'VIDEO' && message.media;
  const isDocument = message.type === 'DOCUMENT' && message.media;
  const isAudio = message.type === 'AUDIO' && message.media;
  const isSystem = message.type === 'SYSTEM';
  const isExpiredMedia =
    ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(message.type) && !message.media;

  useEffect(() => {
    if (!showMenu) return;

    const handleClose = () => {
      setShowMenu(false);
      setMenuCoords(null);
    };

    window.addEventListener('close_all_message_menus', handleClose);
    window.addEventListener('click', handleClose);

    // Close on any container scroll to align with native scroll dynamics
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleClose);
    }

    return () => {
      window.removeEventListener('close_all_message_menus', handleClose);
      window.removeEventListener('click', handleClose);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleClose);
      }
    };
  }, [showMenu]);

  const reactionCounts = useMemo(() => {
    const map = new Map<string, number>();
    message.reactions?.forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [message.reactions]);

  if (isSystem) {
    return (
      <div className="flex justify-center w-full my-4">
        <span className="bg-surface-hover text-text-muted text-xs px-3 py-1 rounded-full border border-border backdrop-blur-sm">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div
        id={`msg-${message.id}`}
        className={cn(
          'flex w-full mb-1.5 relative px-8',
          isOwnMessage ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'flex flex-col max-w-[75%] md:max-w-[70%] relative group/bubble',
            isOwnMessage ? 'items-end' : 'items-start'
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className={cn(
                'rounded-2xl relative overflow-hidden flex-1 px-3.5 py-2 select-none border border-border/40',
                isOwnMessage
                  ? 'bg-surface-hover/70 text-text-muted rounded-br-md shadow-sm'
                  : 'bg-surface-hover/40 text-text-muted rounded-bl-md shadow-card'
              )}
            >
              <p className="text-[14px] italic flex items-center gap-1.5 text-text-muted/80">
                <Trash className="w-3.5 h-3.5 opacity-60" /> This message was deleted
              </p>
              <div className="text-[10px] mt-0.5 text-right opacity-60 text-text-muted/60">
                {format(new Date(message.createdAt), 'hh:mm a')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const colors = [
    'text-teal-500',
    'text-blue-500',
    'text-indigo-500',
    'text-cyan-500',
    'text-pink-500',
    'text-orange-500',
  ];
  const nameColor = sender ? colors[sender.id.length % colors.length] : 'text-text-secondary';
  const showReadReceipts = currentUser?.settings?.privacy?.readReceipts ?? true;

  const isStarred = message.starredBy?.includes(currentUser?.id as string);

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    // Close other open menus
    window.dispatchEvent(new CustomEvent('close_all_message_menus'));

    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const menuHeight = 280;
    const menuWidth = 170;

    let top = rect.bottom + 4;
    let left = isOwnMessage ? rect.right - menuWidth : rect.left;

    // Near bottom -> open upwards
    if (rect.bottom + menuHeight > viewportHeight && rect.top > menuHeight) {
      top = rect.top - menuHeight - 4;
    }

    // Left/Right boundaries safety checks
    if (left < 10) {
      left = 10;
    } else if (left + menuWidth > viewportWidth - 10) {
      left = viewportWidth - menuWidth - 10;
    }

    setMenuCoords({ top, left });
    setShowMenu(true);
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'flex w-full mb-1.5 relative px-8',
        isOwnMessage ? 'justify-end' : 'justify-start',
        showMenu || isAddModalOpen ? 'z-40' : 'z-10'
      )}
    >
      {/* Main Message Bubble Layout wrapper with group/bubble to keep button near bubble */}
      <div
        className={cn(
          'flex flex-col max-w-[75%] md:max-w-[70%] relative group/bubble',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        <div className="flex items-center gap-2 w-full">
          {isOwnMessage && !isSystem && (
            <div className="opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 shrink-0">
              <IconButton
                label="Actions"
                onClick={handleOpenMenu}
                className="w-7 h-7 bg-card rounded-lg border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md transition-all"
              >
                <MoreVertical className="w-4 h-4 text-text-secondary" />
              </IconButton>
            </div>
          )}

          <div
            className={cn(
              'rounded-2xl relative overflow-hidden flex-1 transition-all duration-300',
              isOwnMessage ? 'bubble-own rounded-br-md' : 'bubble-other rounded-bl-md',
              message.isPinned &&
                'border-2 border-amber/50 dark:border-amber/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
              !isImage && !isVideo && message.type !== 'GIF' && 'px-3.5 py-2'
            )}
          >
            {message.forwarded && (
              <p
                className={cn(
                  'text-[10px] italic opacity-60 flex items-center gap-1 mb-1 px-1',
                  (isImage || isVideo || message.type === 'GIF') && 'px-3 pt-2'
                )}
              >
                ↪ Forwarded
              </p>
            )}

            {message.replyTo && (
              <div
                onClick={() => onScrollToMessage?.(message.replyTo!.id)}
                className={cn(
                  'p-2 rounded-lg border-l-4 text-xs mb-1.5 cursor-pointer transition-colors shadow-neo-in-sm',
                  isOwnMessage
                    ? 'bg-black/20 border-white/60 text-white/90 hover:bg-black/30'
                    : 'bg-composer border-secondary text-text-secondary hover:bg-black/5 dark:hover:bg-white/5',
                  (isImage || isVideo || message.type === 'GIF') && 'mx-3 mt-2'
                )}
              >
                <p className="font-semibold opacity-90 mb-0.5 text-[11px]">
                  {message.replyTo.senderId === currentUser?.id
                    ? 'You'
                    : getContactName(message.replyTo.senderId, sender)}
                </p>
                <p className="truncate opacity-80">
                  {message.replyTo.isDeleted ? (
                    <span className="italic flex items-center gap-1 opacity-70">
                      <Trash className="w-3 h-3 inline" /> This message was deleted
                    </span>
                  ) : (
                    <>
                      {message.replyTo.type === 'IMAGE' && '📷 Photo'}
                      {message.replyTo.type === 'VIDEO' && '🎥 Video'}
                      {message.replyTo.type === 'AUDIO' && '🎵 Audio'}
                      {message.replyTo.type === 'DOCUMENT' && '📄 Document'}
                      {message.replyTo.type === 'GIF' && '🎬 GIF'}
                      {message.replyTo.type === 'TEXT' && message.replyTo.content}
                    </>
                  )}
                </p>
              </div>
            )}

            {!isOwnMessage && showSenderName && sender && (
              <p
                className={cn(
                  'text-xs font-semibold mb-1 cursor-pointer hover:underline',
                  nameColor,
                  (isImage || isVideo || message.type === 'GIF') && 'px-3 pt-2'
                )}
              >
                {getContactName(sender.id || (sender as any)?._id, sender)}
              </p>
            )}

            {isImage && message.media && (
              <div
                className="p-1 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => onMediaClick?.(message)}
              >
                <SecureMedia
                  type="img"
                  src={message.media.mediaId || message.media.url}
                  alt="Media"
                  className="w-full max-w-[300px] h-auto rounded-xl object-cover"
                />
              </div>
            )}

            {isVideo && message.media && (
              <div
                className="p-1 cursor-pointer relative group/video flex items-center justify-center"
                onClick={() => onMediaClick?.(message)}
              >
                <SecureMedia
                  type="video"
                  src={message.media.mediaId || message.media.url}
                  className="w-full max-w-[300px] h-auto rounded-xl object-cover"
                  controls={false}
                />
                <div className="absolute inset-0 bg-black/20 group-hover/video:bg-black/40 rounded-xl transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white scale-90 group-hover/video:scale-100 transition-all">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            {isDocument && message.media && (
              <div
                onClick={() => onMediaClick?.(message)}
                className={cn(
                  'flex items-center gap-3 p-3 mb-1 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5',
                  isOwnMessage ? 'bg-white/10' : 'bg-surface-hover'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isOwnMessage ? 'bg-white/20' : 'bg-primary-500/10'
                  )}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="text-sm font-medium truncate">{message.media?.name}</p>
                  <p className="text-xs opacity-70">
                    {((message.media?.size || 0) / 1024 / 1024).toFixed(2)} MB •{' '}
                    {message.media?.mimeType.split('/')[1]?.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={(e) =>
                    handleDownload(e, message.media?.mediaId || message.media?.url || '')
                  }
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    isOwnMessage ? 'hover:bg-white/20' : 'hover:bg-surface-hover'
                  )}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}

            {isAudio && message.media && (
              <div className="cursor-pointer" onClick={() => onMediaClick?.(message)}>
                <VoiceNotePlayer
                  url={message.media?.mediaId || message.media?.url || ''}
                  isOwnMessage={isOwnMessage}
                />
              </div>
            )}

            {isExpiredMedia && (
              <div
                className={cn(
                  'flex items-center gap-3 p-3 mb-1 rounded-xl border border-dashed select-none bg-surface/50 border-border/60 text-text-muted/80 w-full max-w-[280px]'
                )}
              >
                <div className="p-2 rounded-lg bg-surface-hover border border-border">
                  <Info className="w-5 h-5 text-text-muted" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">This media has expired</p>
                </div>
              </div>
            )}

            {message.type === 'CONTACT' && message.sharedContact && (
              <ContactCard
                sharedContact={message.sharedContact}
                isOwnMessage={isOwnMessage}
                onAddContactClick={() => setIsAddModalOpen(true)}
              />
            )}

            {message.type === 'GIF' && message.gifId && (
              <div className="p-1 w-[200px] h-[150px] rounded-xl overflow-hidden">
                <GifImage
                  src={
                    GIF_LIBRARY.find((g) => g.id === message.gifId)?.path ||
                    `/gifs/${message.gifId}.gif`
                  }
                  alt={GIF_LIBRARY.find((g) => g.id === message.gifId)?.name || 'GIF'}
                  className="rounded-lg object-cover w-full h-full"
                />
              </div>
            )}

            {message.content && message.type !== 'CONTACT' && message.type !== 'GIF' && (
              <p
                className={cn(
                  'text-[15px] leading-relaxed break-words',
                  (isImage || isVideo) && 'px-3 pb-2 pt-1'
                )}
              >
                {message.content}
              </p>
            )}

            <div
              className={cn(
                'text-[10px] mt-0.5 text-right opacity-60 flex justify-end items-center gap-1',
                isOwnMessage ? 'text-white/80' : 'text-text-muted',
                (isImage || isVideo || message.type === 'GIF') &&
                  !message.content &&
                  'absolute bottom-2 right-3 px-2 py-0.5 bg-black/40 rounded-full backdrop-blur-sm !text-white !mt-0',
                (isImage || isVideo || message.type === 'GIF') && message.content && 'px-3 pb-2'
              )}
            >
              {message.isPinned && (
                <Pin className="w-3 h-3 text-primary-500 rotate-45 transform shrink-0" />
              )}
              {isStarred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
              {format(new Date(message.createdAt), 'hh:mm a')}
              {isOwnMessage && (
                <span className="ml-0.5 tracking-tighter font-bold flex items-center">
                  {(message.status as string) === 'PENDING' && (
                    <span className="text-[9px] animate-pulse">🕒</span>
                  )}
                  {(message.status as string) === 'FAILED' && (
                    <span className="text-red-500 text-xs" title="Failed to send">
                      ⚠️
                    </span>
                  )}
                  {message.status === 'SENT' && '✓'}
                  {message.status === 'DELIVERED' && '✓✓'}
                  {message.status === 'READ' && (
                    <span className={showReadReceipts ? 'text-accent' : ''}>✓✓</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {!isOwnMessage && !isSystem && (
            <div className="opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 shrink-0">
              <IconButton
                label="Actions"
                onClick={handleOpenMenu}
                className="w-7 h-7 bg-card rounded-lg border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md transition-all"
              >
                <MoreVertical className="w-4 h-4 text-text-secondary" />
              </IconButton>
            </div>
          )}
        </div>

        {/* Grouped Emoji Reactions Bar */}
        {reactionCounts.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 mt-1 shadow-neo-out-sm border border-white/20 bg-card rounded-full px-2 py-0.5 w-fit z-10',
              isOwnMessage ? 'self-end' : 'self-start'
            )}
          >
            {reactionCounts.map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() =>
                  socket?.emit('react_message', {
                    messageId: message.id,
                    chatId: message.chatId,
                    emoji,
                  })
                }
                className="flex items-center gap-1 text-[11px] hover:bg-black/5 dark:hover:bg-white/5 px-1 py-0.5 rounded-full transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-[9px] text-text-secondary font-semibold">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* React Portal Dropdown Menu (WhatsApp Web Style) */}
      {showMenu &&
        menuCoords &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              zIndex: 99999,
            }}
            className="bg-card border border-white/20 rounded-2xl shadow-neo-out-lg p-1.5 min-w-[180px] flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Emoji Picker */}
            <div className="flex gap-1 border-b border-black/5 dark:border-white/5 pb-1.5 px-1 py-1 justify-between">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    socket?.emit('react_message', {
                      messageId: message.id,
                      chatId: message.chatId,
                      emoji,
                    });
                    setShowMenu(false);
                    setMenuCoords(null);
                  }}
                  className="hover:scale-125 transition-transform duration-100 text-sm p-0.5 animate-fadeIn"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {onReply && (
              <button
                onClick={() => {
                  onReply(message);
                  setShowMenu(false);
                  setMenuCoords(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface-hover rounded-lg text-left"
              >
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
            )}
            {onForward && !isExpiredMedia && (
              <button
                onClick={() => {
                  onForward(message);
                  setShowMenu(false);
                  setMenuCoords(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface-hover rounded-lg text-left"
              >
                <Forward className="w-3.5 h-3.5" /> Forward
              </button>
            )}
            <button
              onClick={() => {
                socket?.emit('star_message', {
                  messageId: message.id,
                  chatId: message.chatId,
                  isStarred: !isStarred,
                });
                setShowMenu(false);
                setMenuCoords(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface-hover rounded-lg text-left"
            >
              <Star className="w-3.5 h-3.5" /> {isStarred ? 'Unstar' : 'Star'}
            </button>
            <button
              onClick={() => {
                socket?.emit('pin_message', {
                  messageId: message.id,
                  chatId: message.chatId,
                  isPinned: !message.isPinned,
                });
                setShowMenu(false);
                setMenuCoords(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface-hover rounded-lg text-left"
            >
              <Pin className="w-3.5 h-3.5" /> {message.isPinned ? 'Unpin' : 'Pin'}
            </button>
            {isOwnMessage && (
              <button
                onClick={() => {
                  if (onInfoClick) {
                    onInfoClick(message);
                  } else {
                    setShowInfo(true);
                  }
                  setShowMenu(false);
                  setMenuCoords(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-surface-hover rounded-lg text-left"
              >
                <Info className="w-3.5 h-3.5" /> Message Info
              </button>
            )}
            {isOwnMessage && (
              <button
                onClick={() => {
                  socket?.emit('delete_message', { messageId: message.id, chatId: message.chatId });
                  setShowMenu(false);
                  setMenuCoords(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-error hover:bg-error/10 rounded-lg text-left font-medium"
              >
                <Trash className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>,
          document.body
        )}
      {showInfo && isOwnMessage && (
        <Dialog
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          title="Message Info"
          className="max-w-sm"
        >
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-text-secondary">Sent</span>
              <span className="text-sm font-medium text-text-primary">
                {formatMessageInfoTimestamp(message.createdAt)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-text-secondary">Delivered</span>
              <span className="text-sm font-medium text-text-primary">
                {message.deliveredAt
                  ? formatMessageInfoTimestamp(message.deliveredAt)
                  : message.status === 'READ' || message.status === 'DELIVERED'
                    ? 'Delivered'
                    : 'Pending...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Seen / Read</span>
              <span className="text-sm font-medium text-text-primary">
                {message.seenAt
                  ? formatMessageInfoTimestamp(message.seenAt)
                  : message.status === 'READ'
                    ? 'Read'
                    : 'Not read yet'}
              </span>
            </div>
          </div>
        </Dialog>
      )}

      {message.type === 'CONTACT' && message.sharedContact && (
        <AddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          initialUsername={message.sharedContact.username}
          initialCustomName={message.sharedContact.fullName}
          sharedContactInfo={{
            profilePhoto: message.sharedContact.profilePhoto,
            username: message.sharedContact.username,
            fullName: message.sharedContact.fullName,
          }}
        />
      )}
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showSenderName === nextProps.showSenderName &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.isPinned === nextProps.message.isPinned &&
    prevProps.message.isDeleted === nextProps.message.isDeleted &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.type === nextProps.message.type &&
    JSON.stringify(prevProps.message.starredBy) === JSON.stringify(nextProps.message.starredBy) &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    JSON.stringify(prevProps.message.media) === JSON.stringify(nextProps.message.media)
  );
});
