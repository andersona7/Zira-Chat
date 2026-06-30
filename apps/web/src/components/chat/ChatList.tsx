import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useGetChatsQuery, chatApi, useCreateDirectChatMutation, useVerifyLockerPinMutation, useRequestLockPinResetCodeMutation, useVerifyLockResetOtpMutation, useVerifyPasswordForLockResetMutation, useResetLockPinMutation } from '@/store/api/chatApi';
import { useGetContactsQuery } from '@/store/api/contactApi';
import { setActiveChat, setLockerUnlocked } from '@/store/slices/chatSlice';
import { selectActiveChat } from '@/store/selectors';
import { Avatar, Dialog, Input, Button } from '@zira/ui';
import { SecureMedia } from '../common/SecureMedia';
import { format } from 'date-fns';
import { cn } from '@zira/utils';
import { Users, BellOff, Heart, Lock } from 'lucide-react';
import { useContactNames } from '@/hooks/useContactNames';
import { useExitLockedChat } from '@/hooks/useExitLockedChat';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ChatListProps {
  onChatSelected?: () => void;
  isCollapsed?: boolean;
  searchQuery?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onChatSelected, isCollapsed, searchQuery }) => {
  const { data, isLoading } = useGetChatsQuery();
  const { data: contactsData } = useGetContactsQuery();
  const [createDirectChat] = useCreateDirectChatMutation();
  const activeChat = useSelector(selectActiveChat);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const unlockedChats = useSelector((state: RootState) => (state.chat as any).unlockedChats || []);
  const dispatch = useDispatch<any>();
  const { getContactName } = useContactNames();
  const exitLockedChat = useExitLockedChat();

  const [activeTab, setActiveTab] = React.useState<'all' | 'favourite'>('all');
  const [isLockedSectionExpanded, setIsLockedSectionExpanded] = React.useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  
  // Account-level Chat Lock Mutations
  const [verifyLockerPin] = useVerifyLockerPinMutation();
  const [verifyPassword] = useVerifyPasswordForLockResetMutation();
  const [sendOtp] = useRequestLockPinResetCodeMutation();
  const [verifyOtp] = useVerifyLockResetOtpMutation();
  const [resetPin] = useResetLockPinMutation();
  const isLockerUnlocked = useSelector((state: RootState) => state.chat.isLockerUnlocked);

  const [recoveryStep, setRecoveryStep] = React.useState<'none' | 'password' | 'otp' | 'new_pin'>('none');
  const [verifyPassInput, setVerifyPassInput] = React.useState('');
  const [otpInput, setOtpInput] = React.useState('');
  const [newPinInput, setNewPinInput] = React.useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = React.useState('');

  const handleStartRecovery = async () => {
    setRecoveryStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPassword({ password: verifyPassInput }).unwrap();
      toast.success('Password verified. Sending OTP...');
      await sendOtp().unwrap();
      setRecoveryStep('otp');
    } catch (err: any) {
      toast.error(err.data?.error || 'Password verification failed');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp({ otp: otpInput }).unwrap();
      toast.success('OTP verified successfully');
      setRecoveryStep('new_pin');
    } catch (err: any) {
      toast.error(err.data?.error || 'OTP verification failed');
    }
  };

  const handlePinResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput !== confirmNewPinInput) {
      return toast.error('PINs do not match');
    }
    try {
      await resetPin({ newPin: newPinInput }).unwrap();
      toast.success('PIN reset successfully across all locked chats');
      setRecoveryStep('none');
      setIsUnlockModalOpen(false);
      setPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      setOtpInput('');
      setVerifyPassInput('');
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to reset PIN');
    }
  };

  const [chatToUnlock, setChatToUnlock] = React.useState<any>(null);

  const favouriteContacts = contactsData?.data?.filter((c: any) => c.isFavourite) || [];
  const favouriteContactUserIds = new Set(favouriteContacts.map((c: any) => c.contactUser.id));

  const chats = data?.data || [];

  // Filter out chats that are locked from the normal chats list.
  // Locked chats will only appear in the Locked Chats section (and once unlocked, they move into the normal list).
  const lockedChats = chats.filter((c: any) => c.isLocked);
  const normalChats = chats.filter((c: any) => !c.isLocked || (c.isLocked && isLockerUnlocked));

  const filteredChats = normalChats.filter((chat: any) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (chat.type === 'DIRECT') {
        const otherParticipant = chat.participants.find((p: any) => p.id !== currentUser?.id);
        const contactName = otherParticipant ? getContactName(otherParticipant.id || (otherParticipant as any)._id, otherParticipant) : '';
        const username = otherParticipant?.username || '';
        if (!contactName.toLowerCase().includes(q) && !username.toLowerCase().includes(q)) {
          return false;
        }
      } else if (chat.type === 'GROUP') {
        const groupName = chat.groupMetadata?.name || '';
        if (!groupName.toLowerCase().includes(q)) {
          return false;
        }
      }
    }

    if (activeTab === 'all') return true;
    if (chat.type === 'DIRECT') {
      const otherParticipant = chat.participants.find((p: any) => p.id !== currentUser?.id);
      return otherParticipant && favouriteContactUserIds.has(otherParticipant.id);
    }
    return false;
  });

  const handleOpenLockedSection = () => {
    if (isLockedSectionExpanded) {
      setIsLockedSectionExpanded(false);
    } else {
      // Prompt for PIN to unlock the section overview
      setChatToUnlock({ isSection: true });
      setIsUnlockModalOpen(true);
    }
  };

  const handleChatClick = (chat: any) => {
    const isLocked = chat.isLocked && !isLockerUnlocked;
    if (isLocked) {
      setChatToUnlock(chat);
      setIsUnlockModalOpen(true);
    } else {
      if (isLockerUnlocked && !chat.isLocked) {
        // Automatically re-lock the locker when opening any normal (unlocked) chat
        dispatch(setLockerUnlocked({ unlocked: false, token: null }));
      }
      dispatch(setActiveChat(chat));
      if (currentUser?.id) {
        dispatch(
          chatApi.util.updateQueryData('getChats', undefined, (draft) => {
            if (draft.data) {
              const c = draft.data.find((item: any) => item.id === chat.id);
              if (c) {
                if (!c.unreadCounts) c.unreadCounts = {};
                c.unreadCounts[currentUser.id] = 0;
              }
            }
          })
        );
      }
      onChatSelected?.();
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatToUnlock) return;
    try {
      const res = await verifyLockerPin({ pin: pinInput }).unwrap();
      if (res.success && res.data?.lockerToken) {
        toast.success('Locker Unlocked');
        dispatch(setLockerUnlocked({ unlocked: true, token: res.data.lockerToken }));
        setIsLockedSectionExpanded(true);
        setIsUnlockModalOpen(false);
        setPinInput('');
        
        // If a specific chat was clicked, open it now!
        if (chatToUnlock && !chatToUnlock.isSection) {
          dispatch(setActiveChat(chatToUnlock));
          onChatSelected?.();
        }
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to unlock');
    }
  };

  if (isLoading) return (
    <div className="p-6 flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      {!isCollapsed && <span className="text-text-muted text-sm">Loading chats...</span>}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden flex-1">
      {/* Tabs Header - Styled as a premium sliding switch */}
      {!isCollapsed && (
        <div className="px-4.5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex bg-composer p-1 rounded-2xl relative shadow-neo-in-sm border border-black/5 dark:border-white/5">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 relative focus:outline-none rounded-xl z-10",
                activeTab === 'all' ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              )}
            >
              All
              {activeTab === 'all' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-card shadow-neo-out-sm rounded-xl -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('favourite')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 relative focus:outline-none flex items-center justify-center gap-1.5 rounded-xl z-10",
                activeTab === 'favourite' ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", activeTab === 'favourite' ? "text-error fill-current animate-pulse" : "text-text-muted")} />
              Favourites
              {activeTab === 'favourite' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-card shadow-neo-out-sm rounded-xl -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chat List Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
        {/* Locked Chats Section Header */}
        {lockedChats.length > 0 && !isCollapsed && !isLockerUnlocked && (
          <div className="mx-1.5 my-1.5 p-1 rounded-2xl bg-card border border-white/20 shadow-neo-out-sm">
            <button
              onClick={handleOpenLockedSection}
              className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-2 font-medium"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-semibold tracking-wide">Locked Conversations</span>
              </div>
              <span className="bg-secondary/15 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-lg border border-secondary/10">
                {lockedChats.length}
              </span>
            </button>
          </div>
        )}

        {lockedChats.length > 0 && !isCollapsed && isLockerUnlocked && (
          <div className="mx-1.5 my-1.5 p-1 rounded-2xl bg-card border border-secondary/20 shadow-neo-out-sm animate-fade-in">
            <button
              onClick={() => {
                if (activeChat && (activeChat as any).isLocked) {
                  exitLockedChat(activeChat.id);
                } else {
                  dispatch(setLockerUnlocked({ unlocked: false, token: null }));
                }
                toast.success('Chats Locked');
              }}
              className="w-full flex items-center justify-between text-xs text-secondary hover:text-secondary/80 transition-colors px-3 py-2 font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-secondary" />
                <span>Exit Locked Section</span>
              </div>
              <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-secondary/15">
                Unlocked
              </span>
            </button>
          </div>
        )}

        {/* List of normal chats */}
        {filteredChats.length === 0 && lockedChats.length === 0 ? (
          activeTab === 'favourite' ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-14 h-14 rounded-2xl bg-error/5 flex items-center justify-center mb-3 text-error border border-error/10"
              >
                <Heart className="w-6.5 h-6.5 stroke-[1.5]" />
              </motion.div>
              <h5 className="text-text-primary font-bold text-sm tracking-tight">No favourites found</h5>
              <p className="text-text-muted text-xs mt-2 max-w-[220px] mx-auto leading-relaxed font-medium">
                Add contacts to your favourites in their profile page to see them here.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
              <div className="w-16 h-16 rounded-2xl bg-composer border border-black/5 dark:border-white/5 flex items-center justify-center mx-auto mb-3 shadow-neo-in-sm">
                <svg className="w-7 h-7 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {!isCollapsed && (
                <>
                  <p className="text-text-primary text-sm font-semibold tracking-tight">No active conversations</p>
                  <p className="text-text-muted text-xs mt-1.5 font-medium">Click the message icon to start chatting</p>
                </>
              )}
            </div>
          )
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChat?.id === chat.id;
            const unreadCount = chat.unreadCounts[currentUser?.id as string] || 0;
            const isMuted = currentUser?.mutedChats?.includes(chat.id);
            
            let chatName = '';
            let chatAvatarUrl: string | undefined;
            let chatFallback = '';

            if (chat.type === 'GROUP') {
              chatName = chat.groupMetadata?.name || 'Unknown Group';
              chatAvatarUrl = chat.groupMetadata?.avatarUrl;
              chatFallback = chatName;
            } else {
              const otherUser = chat.participants.find(p => p.id !== currentUser?.id) || chat.participants[0];
              chatName = getContactName(otherUser.id || (otherUser as any)._id, otherUser);
              chatAvatarUrl = otherUser.avatarUrl;
              chatFallback = chatName;
            }

            const isOnline = chat.type !== 'GROUP' && (() => {
              const otherUser = chat.participants.find(p => p.id !== currentUser?.id) || chat.participants[0];
              return otherUser ? (otherUser.status === 'ONLINE' || otherUser.isOnline) : false;
            })();

            return (
              <button
                key={chat.id}
                onClick={() => handleChatClick(chat)}
                className={cn(
                  "flex items-center transition-all duration-300 text-left relative overflow-hidden group",
                  isCollapsed 
                    ? "justify-center w-12 h-12 mx-auto mb-2.5 rounded-xl border" 
                    : "w-full gap-3 px-3.5 py-3 rounded-xl border mb-2.5 last:mb-0",
                  isActive 
                    ? "bg-composer border-black/5 dark:border-white/5 shadow-neo-in-sm" 
                    : "bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-[1.01]"
                )}
              >
                {/* Active indicator bar */}
                {isActive && !isCollapsed && (
                  <motion.div 
                    layoutId="activeChatBar"
                    className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-primary to-secondary rounded-r-full"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}

                <div className="relative shrink-0">
                  <SecureMedia type="avatar" src={chatAvatarUrl} fallback={chatFallback} size="lg" showOnline={isOnline} />
                  {chat.type === 'GROUP' && (
                    <div className="absolute -bottom-1 -right-1 bg-card rounded-lg p-1 border border-white/20 shadow-neo-out-sm">
                      <Users className="w-3 h-3 text-text-muted" />
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className={cn(
                          "font-bold truncate text-[14.5px] tracking-tight leading-tight",
                          isActive ? "text-primary-600 dark:text-primary-400" : "text-text-primary"
                        )}>{chatName}</h4>
                        {chat.isLocked && <Lock className="w-3.5 h-3.5 text-primary-500 shrink-0 opacity-75" />}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isMuted && <BellOff className="w-3.5 h-3.5 text-text-muted opacity-60" />}
                        {chat.lastMessage && (
                          <span className={cn(
                            "text-[10px] uppercase font-bold tracking-wider",
                            unreadCount > 0 ? "text-primary-500" : "text-text-muted"
                          )}>
                            {format(new Date(chat.lastMessage.createdAt), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={cn(
                        "text-xs truncate pr-3 leading-snug font-medium",
                        unreadCount > 0 ? "text-text-primary font-semibold" : "text-text-secondary",
                        chat.lastMessage?.isDeleted && "italic text-text-muted/80"
                      )}>
                        {chat.lastMessage ? (chat.lastMessage.isDeleted ? 'This message was deleted' : chat.lastMessage.content) : 'Started a chat'}
                      </p>
                      {unreadCount > 0 && (
                        <span className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 min-w-[20px] text-center border",
                          isMuted 
                            ? "bg-composer text-text-muted border-black/5 dark:border-white/5" 
                            : "bg-gradient-to-r from-primary to-secondary text-white border-white/10 shadow-[0_2px_10px_rgba(37,99,235,0.3)]"
                        )}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Unlock PIN Modal */}
      <Dialog 
        isOpen={isUnlockModalOpen} 
        onClose={() => {
          setIsUnlockModalOpen(false);
          setRecoveryStep('none');
          setPinInput('');
        }} 
        title={
          recoveryStep === 'password' ? 'Confirm Account Password' :
          recoveryStep === 'otp' ? 'Enter Email Verification Code' :
          recoveryStep === 'new_pin' ? 'Create New Lock PIN' :
          'Enter Chat Lock PIN'
        }
        className="max-w-sm"
      >
        {recoveryStep === 'none' && (
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Provide your Chat Lock PIN to access locked conversation content.
            </p>
            <Input
              type="password"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN (4-8 digits)"
              className="text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <button 
                type="button" 
                onClick={handleStartRecovery} 
                className="text-xs text-primary-500 hover:underline font-semibold"
              >
                Forgot PIN?
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" type="button" onClick={() => setIsUnlockModalOpen(false)}>Cancel</Button>
                <Button type="submit">Unlock</Button>
              </div>
            </div>
          </form>
        )}

        {recoveryStep === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Verify your identity by entering your Zira Chat account password.
            </p>
            <Input
              type="password"
              value={verifyPassInput}
              onChange={(e) => setVerifyPassInput(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setRecoveryStep('none')}>Back</Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {recoveryStep === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              A 6-digit validation code was sent to your registered email. Enter it below:
            </p>
            <Input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit OTP"
              className="text-center text-lg font-mono tracking-widest"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setRecoveryStep('password')}>Back</Button>
              <Button type="submit">Verify OTP</Button>
            </div>
          </form>
        )}

        {recoveryStep === 'new_pin' && (
          <form onSubmit={handlePinResetSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Configure your new Chat Lock PIN. It must be between 6 and 12 digits, and cannot be sequential or identical numbers.
            </p>
            <Input
              type="password"
              maxLength={8}
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="New PIN (4-8 digits)"
              className="text-center font-mono"
              autoFocus
            />
            <Input
              type="password"
              maxLength={8}
              value={confirmNewPinInput}
              onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm New PIN"
              className="text-center font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setRecoveryStep('otp')}>Back</Button>
              <Button type="submit">Reset PIN</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};