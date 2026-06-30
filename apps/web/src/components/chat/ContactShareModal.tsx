import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ArrowLeft, Send, Users } from 'lucide-react';
import { Dialog, Button, Avatar, IconButton } from '@zira/ui';
import { useGetContactsQuery } from '@/store/api/contactApi';
import { useGetChatsQuery } from '@/store/api/chatApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { cn } from '@zira/utils';
import { useContactNames } from '@/hooks/useContactNames';

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (contact: { userId: string; fullName: string; username: string; profilePhoto?: string }, recipientChatIds: string[]) => void;
  defaultRecipientChatId?: string;
  initialContactToShare?: { userId: string; fullName: string; username: string; profilePhoto?: string } | null;
}

export const ContactShareModal: React.FC<ContactShareModalProps> = ({
  isOpen,
  onClose,
  onShare,
  defaultRecipientChatId,
  initialContactToShare
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: contactsData, isLoading: isLoadingContacts } = useGetContactsQuery();
  const { data: chatsData, isLoading: isLoadingChats } = useGetChatsQuery();
  const { getContactName } = useContactNames();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedContact, setSelectedContact] = useState<{ userId: string; fullName: string; username: string; profilePhoto?: string } | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');



  React.useEffect(() => {
    if (isOpen) {
      setStep(initialContactToShare ? 2 : 1);
      setSelectedContact(initialContactToShare || null);
      setSelectedRecipients(defaultRecipientChatId ? [defaultRecipientChatId] : []);
      setSearchQuery('');
    }
  }, [isOpen, initialContactToShare, defaultRecipientChatId]);



  const contacts = contactsData?.data || [];
  const chats = chatsData?.data || [];

  // Step 1: Filter contacts to share
  const filteredShareContacts = contacts.filter((c) =>
    (c.customName || c.contactUser.displayName).toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Step 2: Filter recipient chats
  const filteredRecipients = chats.filter((chat) => {
    if (chat.type === 'GROUP') {
      return chat.groupMetadata?.name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherUser = chat.participants.find((p) => p.id !== currentUser?.id);
      const name = getContactName(otherUser?.id || (otherUser as any)?._id, otherUser);
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (otherUser?.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const handleSelectContactToShare = (contactUser: any, customName?: string) => {
    setSelectedContact({
      userId: contactUser.id,
      fullName: getContactName(contactUser.id || (contactUser as any)?._id, contactUser),
      username: contactUser.username,
      profilePhoto: contactUser.avatarUrl || contactUser.profilePhoto
    });
    setSearchQuery('');
    setStep(2);
  };

  const handleToggleRecipient = (chatId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSend = () => {
    if (selectedContact && selectedRecipients.length > 0) {
      onShare(selectedContact, selectedRecipients);
      handleClose();
    }
  };

  const handleBack = () => {
    setStep(1);
    setSearchQuery('');
  };

  const handleClose = () => {

    setStep(1);
    setSelectedContact(null);
    setSelectedRecipients(defaultRecipientChatId ? [defaultRecipientChatId] : []);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Share Contact' : `Send ${selectedContact?.fullName}'s Info`}
      className="max-w-md w-full"
    >
      <div className="flex flex-col h-[420px]">
        {/* Header navigation for Step 2 */}
        {step === 2 && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/5 dark:border-white/5 shrink-0">
            <IconButton label="Back" onClick={handleBack} className="w-8 h-8 bg-transparent border-none hover:shadow-neo-out-sm">
              <ArrowLeft className="w-4 h-4" />
            </IconButton>
            <div className="flex items-center gap-2">
              <Avatar
                src={selectedContact?.profilePhoto}
                fallback={selectedContact?.fullName || '?'}
                size="sm"
                className="w-7 h-7"
              />
              <span className="text-sm font-semibold text-text-primary truncate max-w-[200px]">
                {selectedContact?.fullName}
              </span>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex items-center mb-4 shrink-0">
          <Search className="absolute left-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={step === 1 ? 'Search contacts to share...' : 'Search recipient chats...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10.5 pr-4 rounded-xl bg-composer neo-in-sm text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
          />
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {step === 1 ? (
            // STEP 1: Select Contact to Share
            isLoadingContacts ? (
              <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredShareContacts.length === 0 ? (
              <div className="text-center text-text-muted text-sm py-8">No contacts found</div>
            ) : (
              filteredShareContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectContactToShare(c.contactUser, c.customName)}
                  className="flex items-center gap-3 w-[calc(100%-16px)] mx-2 my-1.5 p-2.5 rounded-xl bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-[1.01] transition-all duration-300 text-left group"
                >
                  <Avatar
                    src={c.contactUser.avatarUrl || c.contactUser.profilePhoto}
                    fallback={getContactName(c.contactUser.id || (c.contactUser as any)?._id, c.contactUser)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary truncate">
                      {getContactName(c.contactUser.id || (c.contactUser as any)?._id, c.contactUser)}
                    </h4>
                    <p className="text-xs text-text-muted truncate">@{c.contactUser.username}</p>
                  </div>
                </button>
              ))
            )
          ) : (
            // STEP 2: Select Recipients
            isLoadingChats ? (
              <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="text-center text-text-muted text-sm py-8">No active chats found</div>
            ) : (
              filteredRecipients.map((chat) => {
                const isSelected = selectedRecipients.includes(chat.id);
                let chatName = '';
                let chatAvatar = '';

                if (chat.type === 'GROUP') {
                  chatName = chat.groupMetadata?.name || 'Group Chat';
                  chatAvatar = chat.groupMetadata?.avatarUrl || '';
                } else {
                  const other = chat.participants.find((p) => p.id !== currentUser?.id);
                  chatName = getContactName(other?.id || (other as any)?._id, other) || 'Direct Chat';
                  chatAvatar = other?.avatarUrl || '';
                }

                return (
                  <button
                    key={chat.id}
                    onClick={() => handleToggleRecipient(chat.id)}
                    className={cn(
                      "flex items-center justify-between w-[calc(100%-16px)] mx-2 my-1.5 p-2.5 rounded-xl transition-all duration-300 text-left border",
                      isSelected 
                        ? "bg-composer border-secondary/20 shadow-neo-in-sm" 
                        : "bg-card border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-[1.01]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {chat.type === 'GROUP' ? (
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/10">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                      ) : (
                        <Avatar src={chatAvatar} fallback={chatName} size="md" className="shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-text-primary truncate">{chatName}</h4>
                        <p className="text-xs text-text-muted uppercase tracking-wider">{chat.type}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                        isSelected ? "border-secondary bg-secondary text-white shadow-neo-out-sm" : "border-black/10 dark:border-white/10 bg-composer shadow-neo-in-sm"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>

        {/* Footer actions for Step 2 */}
        {step === 2 && (
          <div className="pt-3 border-t border-black/5 dark:border-white/5 mt-3 shrink-0 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {selectedRecipients.length} recipient{selectedRecipients.length !== 1 && 's'} selected
            </span>
            <Button
              onClick={handleSend}
              disabled={selectedRecipients.length === 0}
              className="flex items-center gap-2 px-5 neo-btn-primary"
            >
              <Send className="w-4 h-4" />
              Send Contact
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
};
