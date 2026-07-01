import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Trash2,
  Heart,
  HeartOff,
  Bell,
  BellOff,
  Lock,
  Unlock,
  Ban,
  Share2,
  Grid,
  List,
  Search,
  Download,
  FileText,
  Link as LinkIcon,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  File,
  Volume2,
  ShieldAlert,
} from 'lucide-react';
import { Avatar, IconButton, Dialog, Button, Input } from '@zira/ui';
import { SecureMedia } from '../common/SecureMedia';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetContactsQuery,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from '@/store/api/contactApi';
import {
  useClearChatMutation,
  useGetSharedMediaQuery,
  useLockChatMutation,
  useUnlockChatMutation,
  chatApi,
} from '@/store/api/chatApi';
import { useBlockUserMutation, useUnblockUserMutation } from '@/store/api/userApi';
import { setActiveChat } from '@/store/slices/chatSlice';
import { selectActiveChat } from '@/store/selectors';
import { setCredentials } from '@/store/slices/authSlice';
import { useContactNames } from '@/hooks/useContactNames';
import { useExitLockedChat } from '@/hooks/useExitLockedChat';
import { AddContactModal } from '../contacts/AddContactModal';
import toast from 'react-hot-toast';

interface ContactDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShareContact?: () => void;
}

export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
  isOpen,
  onClose,
  onShareContact,
}) => {
  const activeChat = useSelector(selectActiveChat);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

  const { data: contactsData } = useGetContactsQuery();
  const { getContactName } = useContactNames();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();
  const [clearChat] = useClearChatMutation();
  const [lockChat] = useLockChatMutation();
  const [unlockChat] = useUnlockChatMutation();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const exitLockedChat = useExitLockedChat();
  const isLockerUnlocked = useSelector((state: RootState) => state.chat.isLockerUnlocked);

  // Lock PIN confirmation modal state
  const [isUnlockPromptOpen, setIsUnlockPromptOpen] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');

  // Clear/Delete confirmation modal states
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const [isDeleteContactDialogOpen, setIsDeleteContactDialogOpen] = useState(false);

  // Find the contact user & current contact settings
  const otherUser = activeChat?.participants.find((p: any) => p.id !== currentUser?.id);
  const contact = contactsData?.data?.find((c: any) => c.contactUser.id === otherUser?.id);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Add Contact Modal State
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // Lock state — driven by the chat model and client-side locker session
  const chatIsLocked = !!(activeChat as any)?.isLocked;
  const isLockerActive = chatIsLocked && !isLockerUnlocked;

  const handleDownload = async (e: React.MouseEvent, mediaIdOrUrl: string, fileName: string) => {
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
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPreview = async (e: React.MouseEvent, mediaIdOrUrl: string) => {
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
        `${import.meta.env.VITE_API_URL || ''}/api/v1/media/${encodeURIComponent(mediaId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Preview failed');
      const resData = await response.json();
      if (resData.success && resData.url) {
        window.open(resData.url, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Shared Media Tab / View State
  const [mediaTab, setMediaTab] = useState<'media' | 'documents' | 'links'>('media');
  const [isGridView, setIsGridView] = useState(true);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaPage, setMediaPage] = useState(1);

  // Fetch shared media
  const {
    data: mediaData,
    isFetching: isFetchingMedia,
    refetch: refetchMedia,
  } = useGetSharedMediaQuery(
    {
      chatId: activeChat?.id || '',
      type: mediaTab,
      page: mediaPage,
      limit: 20,
      search: mediaSearch,
    },
    { skip: !activeChat }
  );

  const [allItems, setAllItems] = useState<any[]>([]);

  // Reset page and items on tab/search change
  useEffect(() => {
    setMediaPage(1);
    setAllItems([]);
  }, [mediaTab, mediaSearch]);

  useEffect(() => {
    if (mediaData && mediaData.data && mediaData.data.items) {
      const newItems = mediaData.data.items;
      if (mediaPage === 1) {
        setAllItems(newItems);
      } else {
        setAllItems((prev) => [...prev, ...newItems]);
      }
    }
  }, [mediaData, mediaPage]);

  if (!activeChat || !currentUser || !otherUser) return null;

  const isBlockedByMe =
    currentUser.blockedUsers?.includes(otherUser.id) || contact?.isBlocked || false;
  const isFavourite = contact?.isFavourite || false;
  const isMuted = contact?.isMuted || false;
  const isLocked = chatIsLocked;

  const handleSaveNickname = async () => {
    if (!contact) {
      toast.error('Add this user to contacts first to edit nickname.');
      setIsEditingName(false);
      return;
    }
    try {
      const nicknameToSave = editedName.trim() === '' ? '' : editedName.trim();
      await updateContact({ id: contact.id, customName: nicknameToSave }).unwrap();
      setIsEditingName(false);
      toast.success(nicknameToSave === '' ? 'Nickname reverted' : 'Nickname updated');
    } catch (err) {
      toast.error('Failed to update nickname');
    }
  };

  const handleToggleFavourite = async () => {
    if (!contact) return toast.error('User must be in contacts list');
    try {
      await updateContact({ id: contact.id, isFavourite: !isFavourite }).unwrap();
      toast.success(!isFavourite ? 'Added to Favourites' : 'Removed from Favourites');
    } catch (err) {
      toast.error('Failed to update Favourites');
    }
  };

  const handleToggleMute = async () => {
    if (!contact) return toast.error('User must be in contacts list');
    try {
      await updateContact({ id: contact.id, isMuted: !isMuted }).unwrap();
      // Keep chat mute in sync
      if (activeChat && token) {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/v1/chats/${activeChat.id}/mute`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success && currentUser) {
          dispatch(
            setCredentials({
              user: { ...currentUser, mutedChats: data.data.mutedChats },
              accessToken: token,
            })
          );
        }
      }
      toast.success(!isMuted ? 'Notifications muted' : 'Notifications unmuted');
    } catch (err) {
      toast.error('Failed to toggle mute');
    }
  };

  const handleToggleLock = async () => {
    if (!activeChat) return;
    try {
      if (isLocked) {
        // Open the PIN confirmation dialog to turn off the chat lock
        setUnlockPinInput('');
        setIsUnlockPromptOpen(true);
      } else {
        // Lock the chat via account-level PIN
        await lockChat(activeChat.id).unwrap();
        toast.success('Chat locked');
        // Dispatch cache update to reflect lock state
        dispatch(chatApi.util.invalidateTags(['Chat']));
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to update lock');
    }
  };

  const handleUnlockConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    try {
      await unlockChat({ chatId: activeChat.id, pin: unlockPinInput }).unwrap();
      toast.success('Chat lock disabled');
      setIsUnlockPromptOpen(false);
      setUnlockPinInput('');
      dispatch(chatApi.util.invalidateTags(['Chat']));
    } catch (err: any) {
      toast.error(err.data?.error || 'Invalid PIN. Failed to disable lock');
    }
  };

  const handleToggleBlock = async () => {
    try {
      if (isBlockedByMe) {
        await unblockUser(otherUser.id).unwrap();
        if (contact) await updateContact({ id: contact.id, isBlocked: false }).unwrap();
        toast.success(
          `${getContactName(otherUser.id || (otherUser as any)._id, otherUser)} unblocked`
        );
      } else {
        await blockUser(otherUser.id).unwrap();
        if (contact) await updateContact({ id: contact.id, isBlocked: true }).unwrap();
        toast.success(
          `${getContactName(otherUser.id || (otherUser as any)._id, otherUser)} blocked`
        );
      }
    } catch (e) {
      toast.error('Failed to update block status');
    }
  };

  const handleShareContact = () => {
    if (onShareContact) {
      onShareContact();
    } else {
      const contactName = getContactName(otherUser.id || (otherUser as any)._id, otherUser);
      const contactInfo = `Contact Card: ${contactName} (@${otherUser.username}) - Email: ${otherUser.email || 'N/A'}`;
      toast.success('Contact card copied to clipboard!');
      navigator.clipboard.writeText(contactInfo);
    }
  };

  const handleClearChat = () => {
    setIsClearChatDialogOpen(true);
  };

  const confirmClearChat = async () => {
    try {
      await clearChat(activeChat.id).unwrap();
      toast.success('Chat history cleared');
      setIsClearChatDialogOpen(false);
      refetchMedia();
    } catch (err) {
      toast.error('Failed to clear chat');
    }
  };

  const handleDeleteContact = () => {
    if (!contact) return toast.error('User is not in your contacts');
    setIsDeleteContactDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contact) return;
    try {
      await deleteContact(contact.id).unwrap();
      toast.success('Contact and chat history deleted');
      setIsDeleteContactDialogOpen(false);
      dispatch(setActiveChat(null));
      onClose();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const loadMoreMedia = () => {
    if (mediaData?.data?.pagination?.hasMore && !isFetchingMedia) {
      setMediaPage((prev) => prev + 1);
    }
  };

  // Helper formatting size
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-surface w-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <h2 className="text-lg font-semibold text-text-primary">Contact Info</h2>
      </header>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center space-y-4 pb-6 border-b border-border">
          <Avatar
            src={otherUser.avatarUrl || otherUser.profilePhoto}
            fallback={getContactName(otherUser.id || (otherUser as any)._id, otherUser) || '?'}
            size="xl"
            className="w-24 h-24 shadow-md"
          />

          {/* Nickname Editor */}
          <div className="w-full flex flex-col items-center">
            {isEditingName ? (
              <div className="flex items-center gap-2 max-w-[80%]">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter nickname"
                  className="text-center"
                  autoFocus
                />
                <IconButton
                  label="Save"
                  onClick={handleSaveNickname}
                  className="bg-primary-500 text-white hover:bg-primary-600"
                >
                  <Check className="w-4 h-4" />
                </IconButton>
                <IconButton label="Cancel" onClick={() => setIsEditingName(false)}>
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            ) : (
              <div className="group flex items-center justify-center gap-2">
                <h3 className="text-xl font-bold text-text-primary">
                  {getContactName(otherUser.id || (otherUser as any)._id, otherUser)}
                </h3>
                {contact && (
                  <button
                    onClick={() => {
                      setEditedName(contact?.customName || '');
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-hover rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-text-secondary">@{otherUser.username}</p>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="space-y-4 pb-6 border-b border-border">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              About
            </label>
            <p className="text-sm text-text-primary mt-1">
              {otherUser.bio || otherUser.about || 'Hey there! I am using Zira Chat.'}
            </p>
          </div>

          {otherUser.email && (
            <div className="flex items-center gap-3 text-text-secondary">
              <Mail className="w-4 h-4 text-text-muted" />
              <span className="text-sm">{otherUser.email}</span>
            </div>
          )}
        </div>

        {/* Settings/Toggles */}
        <div className="space-y-2 pb-6 border-b border-border">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Settings
          </h4>

          {/* Favorite Toggle */}
          <button
            onClick={handleToggleFavourite}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <motion.div
                key={isFavourite ? 'fav' : 'unfav'}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.3, 0.95, 1], opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                {isFavourite ? (
                  <Heart className="w-5 h-5 text-error fill-current" />
                ) : (
                  <Heart className="w-5 h-5 text-text-secondary" />
                )}
              </motion.div>
              <span className="text-sm text-text-primary font-medium">
                {isFavourite ? 'Remove from Favourite' : 'Add to Favourite'}
              </span>
            </div>
            <span className="text-xs text-text-muted">{isFavourite ? 'Yes' : 'No'}</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {isMuted ? (
                <BellOff className="w-5 h-5 text-warning" />
              ) : (
                <Bell className="w-5 h-5 text-text-secondary" />
              )}
              <span className="text-sm text-text-primary font-medium">Mute Notifications</span>
            </div>
            <span className="text-xs text-text-muted">{isMuted ? 'Muted' : 'Off'}</span>
          </button>

          {/* Chat Lock Toggle */}
          <button
            onClick={handleToggleLock}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {isLocked ? (
                <Lock className="w-5 h-5 text-primary-500" />
              ) : (
                <Unlock className="w-5 h-5 text-text-secondary" />
              )}
              <span className="text-sm text-text-primary font-medium">Chat Lock</span>
            </div>
            <span className="text-xs text-text-muted">{isLocked ? 'Locked' : 'Off'}</span>
          </button>

          {/* Exit Locked Chat — visible when locked and locker is currently unlocked (user can re-lock manually) */}
          {isLocked && isLockerUnlocked && (
            <button
              onClick={() => {
                if (!activeChat) return;
                exitLockedChat(activeChat.id);
                toast.success('Chat Locked');
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary-500 animate-pulse" />
                <span className="text-sm text-primary-500 font-semibold">Exit Locked Chat</span>
              </div>
              <span className="text-xs text-primary-500">Lock again</span>
            </button>
          )}

          {/* Block User */}
          <button
            onClick={handleToggleBlock}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-error" />
              <span className="text-sm text-error font-medium">
                {isBlockedByMe ? 'Unblock Contact' : 'Block Contact'}
              </span>
            </div>
          </button>
        </div>

        {/* Shared Media Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Shared Media
            </h4>
            <div className="flex items-center gap-1">
              <IconButton
                label="Grid View"
                onClick={() => setIsGridView(true)}
                className={`w-7 h-7 ${isGridView ? 'text-primary-500 bg-surface-hover' : 'text-text-muted'}`}
              >
                <Grid className="w-4 h-4" />
              </IconButton>
              <IconButton
                label="List View"
                onClick={() => setIsGridView(false)}
                className={`w-7 h-7 ${!isGridView ? 'text-primary-500 bg-surface-hover' : 'text-text-muted'}`}
              >
                <List className="w-4 h-4" />
              </IconButton>
            </div>
          </div>

          {/* Categories Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMediaTab('media')}
              className={`flex-1 pb-2 text-xs font-semibold transition-all border-b-2 text-center ${mediaTab === 'media' ? 'border-primary-500 text-primary-500' : 'border-transparent text-text-muted'}`}
            >
              Media ({mediaData?.data?.counts?.media || 0})
            </button>
            <button
              onClick={() => setMediaTab('documents')}
              className={`flex-1 pb-2 text-xs font-semibold transition-all border-b-2 text-center ${mediaTab === 'documents' ? 'border-primary-500 text-primary-500' : 'border-transparent text-text-muted'}`}
            >
              Docs ({mediaData?.data?.counts?.documents || 0})
            </button>
            <button
              onClick={() => setMediaTab('links')}
              className={`flex-1 pb-2 text-xs font-semibold transition-all border-b-2 text-center ${mediaTab === 'links' ? 'border-primary-500 text-primary-500' : 'border-transparent text-text-muted'}`}
            >
              Links ({mediaData?.data?.counts?.links || 0})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder={`Search shared ${mediaTab}...`}
              className="w-full text-xs text-text-primary bg-surface-hover pl-8 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          </div>

          {/* Media Content Grid/List */}
          {isFetchingMedia && allItems.length === 0 ? (
            <div className="flex justify-center p-4">
              <RefreshCw className="w-5 h-5 text-primary-500 animate-spin" />
            </div>
          ) : allItems.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-6">No shared items found.</p>
          ) : (
            <div className="space-y-4">
              {isGridView && mediaTab === 'media' ? (
                <div className="grid grid-cols-4 gap-2">
                  {allItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="relative aspect-square bg-surface-hover rounded-lg overflow-hidden group border border-border"
                    >
                      {item.type === 'IMAGE' ? (
                        <SecureMedia
                          type="img"
                          src={item.media?.mediaId || item.media?.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-hover">
                          <FileText className="w-6 h-6 text-text-secondary" />
                        </div>
                      )}
                      <button
                        onClick={(e) =>
                          handleDownload(
                            e,
                            item.media?.mediaId || item.media?.url,
                            item.media?.name
                          )
                        }
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all text-white text-xs"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {allItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-surface-hover rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-background rounded-lg text-text-secondary">
                          {item.type === 'DOCUMENT' ? (
                            <FileText className="w-5 h-5" />
                          ) : item.type === 'TEXT' ? (
                            <LinkIcon className="w-5 h-5 text-primary-500" />
                          ) : (
                            <File className="w-5 h-5" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {item.media?.name || item.content || 'Shared media'}
                          </p>
                          {item.media?.size && (
                            <span className="text-[10px] text-text-muted block mt-0.5">
                              {formatBytes(item.media.size)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.media?.url ? (
                          <button
                            onClick={(e) =>
                              handleOpenPreview(e, item.media.mediaId || item.media.url)
                            }
                            className="p-1.5 hover:bg-background rounded-lg text-text-secondary hover:text-primary-500 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <a
                            href={item.content?.match(/https?:\/\/[^\s]+/i)?.[0]}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-background rounded-lg text-text-secondary hover:text-primary-500 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        {item.media?.url && (
                          <button
                            onClick={(e) =>
                              handleDownload(
                                e,
                                item.media.mediaId || item.media.url,
                                item.media.name
                              )
                            }
                            className="p-1.5 hover:bg-background rounded-lg text-text-secondary hover:text-primary-500 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mediaData?.data?.pagination?.hasMore && (
                <button
                  onClick={loadMoreMedia}
                  className="w-full text-center text-xs text-primary-500 font-semibold py-2 hover:underline flex items-center justify-center gap-1.5"
                >
                  {isFetchingMedia ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat Actions */}
        <div className="pt-6 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Actions
          </h4>

          {!contact && (
            <Button
              variant="primary"
              onClick={() => setIsAddContactOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white bg-primary-500 hover:bg-primary-600 border-transparent font-medium"
            >
              Add Contact
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={handleShareContact}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border"
          >
            <Share2 className="w-4 h-4" /> Share Contact
          </Button>

          <Button
            variant="secondary"
            onClick={handleClearChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-error/5 hover:text-error hover:border-error/20"
          >
            <Trash2 className="w-4 h-4" /> Clear Chat
          </Button>

          {contact && (
            <Button
              variant="secondary"
              onClick={handleDeleteContact}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 hover:bg-error/20 text-error border-transparent"
            >
              <Trash2 className="w-4 h-4" /> Delete Contact
            </Button>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        initialUsername={otherUser?.username || ''}
      />

      {/* Disable Chat Lock PIN Prompt Dialog */}
      <Dialog
        isOpen={isUnlockPromptOpen}
        onClose={() => setIsUnlockPromptOpen(false)}
        title="Remove Chat Lock"
      >
        <form onSubmit={handleUnlockConfirmSubmit} className="space-y-4">
          <p className="text-text-secondary text-sm">
            Enter your Chat Lock PIN to disable the lock for this chat.
          </p>
          <Input
            type="password"
            placeholder="Enter PIN"
            value={unlockPinInput}
            onChange={(e) => setUnlockPinInput(e.target.value)}
            className="w-full"
            autoFocus
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsUnlockPromptOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog
        isOpen={isClearChatDialogOpen}
        onClose={() => setIsClearChatDialogOpen(false)}
        title="Clear Chat History"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Are you sure you want to clear this chat? All messages and call history will be deleted
            for you. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsClearChatDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmClearChat}>
              Clear Chat
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Contact Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteContactDialogOpen}
        onClose={() => setIsDeleteContactDialogOpen(false)}
        title="Delete Contact"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Are you sure you want to delete this contact? This will permanently delete your chat
            history and remove them from your contacts. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteContact}>
              Delete Contact
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
