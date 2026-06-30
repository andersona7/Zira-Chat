import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, UserPlus, Trash2 } from 'lucide-react';
import { Avatar, IconButton, Dialog, Button } from '@zira/ui';
import { SecureMedia } from '../common/SecureMedia';
import { useGetContactsQuery, useDeleteContactMutation } from '@/store/api/contactApi';
import { useCreateDirectChatMutation } from '@/store/api/chatApi';
import { useDispatch } from 'react-redux';
import { setActiveChat } from '@/store/slices/chatSlice';
import { AddContactModal } from './AddContactModal';
import toast from 'react-hot-toast';
import type { Contact } from '@zira/types';
import { useContactNames } from '@/hooks/useContactNames';

interface NewChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatPanel: React.FC<NewChatPanelProps> = ({ isOpen, onClose }) => {
  const { data, isLoading } = useGetContactsQuery(undefined, { skip: !isOpen });
  const [createDirectChat] = useCreateDirectChatMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const dispatch = useDispatch();
  const { getContactName } = useContactNames();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const contacts = data?.data || [];
  const filteredContacts = contacts.filter((c) => {
    const name = getContactName(c.contactUser.id || (c.contactUser as any)._id, c.contactUser).toLowerCase();
    const username = (c.contactUser.username || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const handleChatOpen = async (userId: string) => {
    try {
      const res = await createDirectChat(userId).unwrap();
      if (res.success && res.data) {
        dispatch(setActiveChat(res.data));
        onClose();
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      const res = await deleteContact(contactToDelete.id).unwrap();
      if (res.success) {
        toast.success('Contact deleted!');
        setContactToDelete(null);
      }
    } catch (err) {
      const error = err as any;
      toast.error(error.data?.error || 'Failed to delete contact');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-105%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-105%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-1.5 z-50 flex flex-col bg-panel rounded-xl shadow-neo-out-md border border-white/20 overflow-hidden"
          >
            {/* Header */}
            <header className="flex items-center gap-4 px-4 py-3 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0">
              <IconButton label="Back" onClick={onClose} className="bg-transparent border-none">
                <ArrowLeft className="w-5 h-5" />
              </IconButton>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">New Chat</h2>
            </header>

            {/* Search */}
            <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 shrink-0 bg-transparent">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search contacts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4.5 rounded-xl bg-composer neo-in-sm text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                />
              </div>
            </div>

            {/* Add Contact Button */}
            <button
              onClick={() => setIsAddContactOpen(true)}
              className="flex items-center gap-4 w-[calc(100%-24px)] mx-3 my-2.5 p-2.5 rounded-xl hover:bg-composer hover:shadow-neo-in-sm border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-neo-out-sm border border-white/10">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <span className="text-text-primary font-bold text-sm">Add a contact</span>
            </button>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No contacts found</div>
              ) : filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 w-[calc(100%-24px)] mx-3 my-1.5 p-2.5 rounded-xl bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-[1.01] transition-all duration-200 text-left group"
                >
                  <button
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => handleChatOpen(contact.contactUser.id)}
                  >
                    <SecureMedia type="avatar" src={contact.contactUser.avatarUrl} fallback={getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)} size="md" />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-text-primary font-medium text-[15px]">
                        {getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)}
                      </h4>
                      <p className="text-text-muted text-xs mt-0.5">
                        @{contact.contactUser.username}
                      </p>
                    </div>
                  </button>
                  <div className="shrink-0 flex items-center self-stretch">
                    <IconButton
                      label="Delete contact"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContactToDelete(contact);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 w-9 h-9 text-error hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="w-[18px] h-[18px]" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddContactModal isOpen={isAddContactOpen} onClose={() => setIsAddContactOpen(false)} />

      {/* Delete Contact Confirmation Dialog */}
      <Dialog
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        title="Delete Contact"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text-primary">
              {contactToDelete && getContactName(contactToDelete.contactUser?.id || (contactToDelete.contactUser as any)?._id, contactToDelete.contactUser)}
            </span>{' '}
            from your contacts?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setContactToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteContact} isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};