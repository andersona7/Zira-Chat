import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Search, Users } from 'lucide-react';
import { Avatar, IconButton, Input } from '@zira/ui';
import { useGetContactsQuery } from '@/store/api/contactApi';
import { useCreateGroupChatMutation } from '@/store/api/chatApi';
import { useDispatch } from 'react-redux';
import { setActiveChat } from '@/store/slices/chatSlice';
import { cn } from '@zira/utils';
import toast from 'react-hot-toast';
import { useContactNames } from '@/hooks/useContactNames';

interface CreateGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupPanel: React.FC<CreateGroupPanelProps> = ({ isOpen, onClose }) => {
  const { data, isLoading } = useGetContactsQuery(undefined, { skip: !isOpen });
  const [createGroup, { isLoading: isCreating }] = useCreateGroupChatMutation();
  const dispatch = useDispatch();
  const { getContactName } = useContactNames();

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');

  const contacts = data?.data || [];
  const filteredContacts = contacts.filter((c) => {
    const name = getContactName(c.contactUser.id || (c.contactUser as any)._id, c.contactUser).toLowerCase();
    const username = (c.contactUser.username || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const handleToggleSelect = (userId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setSelectedIds(newSet);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.size === 0) return;
    
    try {
      const res = await createGroup({ 
        name: groupName.trim(), 
        participantIds: Array.from(selectedIds) 
      }).unwrap();
      
      if (res.success && res.data) {
        dispatch(setActiveChat(res.data));
        handleClose();
      }
    } catch (err) {
      toast.error('Failed to create group');
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedIds(newSet => { newSet.clear(); return newSet; });
    setGroupName('');
    setSearchQuery('');
    onClose();
  };
  return (
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
            <IconButton label="Back" onClick={step === 2 ? () => setStep(1) : handleClose} className="bg-transparent border-none">
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              {step === 1 ? 'Add group participants' : 'New group'}
            </h2>
          </header>

          {step === 1 ? (
            <>
              {/* Selected Chips Area */}
              {selectedIds.size > 0 && (
                <div className="px-4 py-3 bg-transparent border-b border-black/5 dark:border-white/5 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
                  {Array.from(selectedIds).map(id => {
                    const contact = contacts.find(c => c.contactUser.id === id);
                    if (!contact) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-full text-xs text-text-primary whitespace-nowrap border border-white/10 shadow-neo-out-sm">
                        <Avatar src={contact.contactUser.avatarUrl} fallback={getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)} size="sm" className="!w-5 !h-5 !text-[8px]" />
                        {getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)}
                        <button onClick={() => handleToggleSelect(id)} className="text-text-muted hover:text-text-primary transition-colors ml-1">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 shrink-0 bg-transparent">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search contacts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10.5 pr-4 rounded-xl bg-composer neo-in-sm text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative py-2">
                {isLoading ? (
                  <div className="p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    className="flex items-center gap-3 w-[calc(100%-24px)] mx-3 my-1.5 p-2.5 rounded-xl bg-card border border-white/20 shadow-neo-out-sm hover:shadow-neo-out-md hover:scale-[1.01] transition-all duration-200 text-left group"
                    onClick={() => handleToggleSelect(contact.contactUser.id)}
                  >
                    <div className="relative">
                      <Avatar src={contact.contactUser.avatarUrl} fallback={getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)} size="md" />
                      {selectedIds.has(contact.contactUser.id) && (
                        <div className="absolute -bottom-1 -right-1 bg-secondary rounded-full p-0.5 border-2 border-card shadow-neo-out-sm">
                          <Check className="w-3 h-3 text-white stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-text-primary font-medium text-[15px] truncate">
                        {getContactName(contact.contactUser.id || (contact.contactUser as any)._id, contact.contactUser)}
                      </h4>
                      <p className="text-xs text-text-muted truncate mt-0.5">@{contact.contactUser.username}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* FAB Next Step */}
              {selectedIds.size > 0 && (
                <div className="absolute bottom-6 right-6 z-10">
                  <IconButton 
                    label="Next step" 
                    onClick={() => setStep(2)}
                    className="w-14 h-14 bg-secondary text-white hover:bg-secondary/90 shadow-neo-out-md border border-white/10 rounded-2xl flex items-center justify-center"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </IconButton>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 bg-transparent flex flex-col items-center pt-10 px-8 relative">
              <div className="w-28 h-28 rounded-2xl bg-composer border border-white/10 flex items-center justify-center mb-8 overflow-hidden text-text-muted shadow-neo-in-sm">
                <Users className="w-12 h-12 text-text-secondary/50 animate-pulse" />
              </div>
              <div className="w-full relative flex items-center">
                <input 
                  autoFocus
                  placeholder="Group Subject" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={25}
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-composer neo-in-sm text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                />
                <span className="absolute right-4 text-xs font-semibold text-text-muted">
                  {25 - groupName.length}
                </span>
              </div>

              <div className="absolute bottom-6 right-6 z-10">
                <IconButton 
                  label="Create group" 
                  onClick={handleCreate}
                  disabled={!groupName.trim() || isCreating}
                  className="w-14 h-14 bg-secondary text-white hover:bg-secondary/90 shadow-neo-out-md border border-white/10 disabled:opacity-50 rounded-2xl flex items-center justify-center"
                >
                  {isCreating ? <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check className="w-6 h-6 stroke-[3px]" />}
                </IconButton>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};