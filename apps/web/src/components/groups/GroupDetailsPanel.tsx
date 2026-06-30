import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit2, Check, UserPlus, X, Shield, ShieldAlert, LogOut, Trash2 } from 'lucide-react';
import { Avatar, IconButton, Input, Dialog, Button } from '@zira/ui';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { 
  useUpdateGroupMutation, 
  useAddParticipantsMutation, 
  useRemoveParticipantMutation, 
  useToggleAdminMutation, 
  useDeleteGroupMutation 
} from '@/store/api/chatApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import { useGetContactsQuery } from '@/store/api/contactApi';
import { setActiveChat } from '@/store/slices/chatSlice';
import { selectActiveChat } from '@/store/selectors';
import { useContactNames } from '@/hooks/useContactNames';
import toast from 'react-hot-toast';

interface GroupDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupDetailsPanel: React.FC<GroupDetailsPanelProps> = ({ isOpen, onClose }) => {
  const activeChat = useSelector(selectActiveChat);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const { getContactName } = useContactNames();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'leave' | 'remove' | 'delete';
    targetUserId?: string;
    targetUserName?: string;
  }>({
    isOpen: false,
    type: 'leave'
  });

  const [updateGroup] = useUpdateGroupMutation();
  const [addParticipants] = useAddParticipantsMutation();
  const [removeParticipant] = useRemoveParticipantMutation();
  const [toggleAdmin] = useToggleAdminMutation();
  const [deleteGroup] = useDeleteGroupMutation();
  const [uploadMedia, { isLoading: isUploadingMedia }] = useUploadMediaMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contactsData } = useGetContactsQuery();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');

  if (!activeChat || !currentUser || activeChat.type !== 'GROUP') return null;

  const admins = activeChat.groupMetadata?.admins || [];
  const isAdmin = admins.includes(currentUser.id);
  const participants = activeChat.participants || [];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Max file size is 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadMedia(formData).unwrap();
      if (res.success && res.data) {
        await updateGroup({ chatId: activeChat.id, avatarUrl: res.data.url }).unwrap();
        toast.success('Group profile image updated');
      }
    } catch (err) {
      toast.error('Failed to update group profile image');
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === activeChat.groupMetadata?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateGroup({ chatId: activeChat.id, name: editedName.trim() }).unwrap();
      setIsEditingName(false);
      toast.success('Group name updated');
    } catch (err) {
      toast.error('Failed to update group name');
    }
  };

  const handleToggleAdminStatus = async (userId: string) => {
    try {
      await toggleAdmin({ chatId: activeChat.id, targetUserId: userId }).unwrap();
      toast.success('Admin permissions updated');
    } catch (err) {
      toast.error('Failed to update admin permissions');
    }
  };

  const executeRemoveMember = async (userId: string) => {
    const isSelf = userId === currentUser.id;
    try {
      await removeParticipant({ chatId: activeChat.id, userId }).unwrap();
      toast.success(isSelf ? 'Left the group' : 'Participant removed');
      if (isSelf) {
        dispatch(setActiveChat(null));
        onClose();
      }
    } catch (err) {
      toast.error(isSelf ? 'Failed to leave group' : 'Failed to remove participant');
    }
  };

  const executeDelete = async () => {
    try {
      await deleteGroup(activeChat.id).unwrap();
      toast.success('Group deleted');
      dispatch(setActiveChat(null));
      onClose();
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const handleLeaveClick = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'leave',
      targetUserId: currentUser.id
    });
  };

  const handleRemoveMemberClick = (userId: string, username: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'remove',
      targetUserId: userId,
      targetUserName: username
    });
  };

  const handleDeleteClick = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete'
    });
  };

  const existingParticipantIds = new Set(participants.map(p => p.id));
  const addableContacts = (contactsData?.data || []).filter(
    c => !existingParticipantIds.has(c.contactUser.id)
  );

  const filteredAddableContacts = addableContacts.filter(c => {
    const name = getContactName(c.contactUser.id || (c.contactUser as any)._id, c.contactUser).toLowerCase();
    const username = (c.contactUser.username || '').toLowerCase();
    const query = memberSearch.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const handleToggleAddable = (userId: string) => {
    const nextSet = new Set(selectedContactIds);
    if (nextSet.has(userId)) nextSet.delete(userId);
    else nextSet.add(userId);
    setSelectedContactIds(nextSet);
  };

  const handleAddSelectedMembers = async () => {
    if (selectedContactIds.size === 0) return;
    try {
      await addParticipants({
        chatId: activeChat.id,
        participantIds: Array.from(selectedContactIds),
      }).unwrap();
      toast.success('Participants added');
      setSelectedContactIds(new Set());
      setIsAddingMembers(false);
    } catch (err) {
      toast.error('Failed to add participants');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface w-full relative overflow-hidden">
      {/* Main Info View */}
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
          <IconButton label="Back" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </IconButton>
          <h2 className="text-lg font-semibold text-text-primary">Group Info</h2>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center space-y-4 border-b border-border pb-6">
            {isAdmin ? (
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="relative group cursor-pointer focus:outline-none rounded-full"
                disabled={isUploadingMedia}
              >
                <Avatar
                  src={activeChat.groupMetadata?.avatarUrl}
                  fallback={activeChat.groupMetadata?.name || '?'}
                  size="lg"
                  className="!w-24 !h-24 !text-2xl ring-4 ring-primary-500/20 group-hover:opacity-75 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingMedia ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Edit2 className="w-5 h-5 text-white" />
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*" 
                />
              </button>
            ) : (
              <Avatar
                src={activeChat.groupMetadata?.avatarUrl}
                fallback={activeChat.groupMetadata?.name || '?'}
                size="lg"
                className="!w-24 !h-24 !text-2xl ring-4 ring-primary-500/20"
              />
            )}
            
            <div className="w-full flex items-center justify-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    maxLength={25}
                    placeholder="Group name"
                    autoFocus
                  />
                  <IconButton label="Save" onClick={handleSaveName} className="bg-primary-500 text-white hover:bg-primary-600">
                    <Check className="w-4 h-4" />
                  </IconButton>
                  <IconButton label="Cancel" onClick={() => setIsEditingName(false)}>
                    <X className="w-4 h-4" />
                  </IconButton>
                </div>
              ) : (
                <div className="group flex items-center justify-center gap-2">
                  <h3 className="text-xl font-bold text-text-primary">
                    {activeChat.groupMetadata?.name}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditedName(activeChat.groupMetadata?.name || '');
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-hover rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <p className="text-xs text-text-secondary">
              {participants.length} member{participants.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Actions & Settings */}
          {isAdmin && (
            <div className="border-b border-border pb-6 space-y-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Admin Controls</h4>
              <button
                onClick={() => {
                  setSelectedContactIds(new Set());
                  setIsAddingMembers(true);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-xl text-left text-sm text-primary-500 font-medium transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Add Members
              </button>
            </div>
          )}

          {/* Participants List */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Members
            </h4>
            
            <div className="space-y-2">
              {participants.map(member => {
                const isMemberAdmin = admins.includes(member.id);
                const isSelf = member.id === currentUser.id;
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-2.5 hover:bg-surface-hover rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src={member.avatarUrl} fallback={getContactName(member.id, member)} size="md" />
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {getContactName(member.id, member)} {isSelf && '(You)'}
                        </h4>
                        <p className="text-xs text-text-secondary">@{member.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isMemberAdmin && (
                        <span className="text-[10px] bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full font-semibold">
                          Admin
                        </span>
                      )}
                      
                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-1">
                          <IconButton
                            label={isMemberAdmin ? "Dismiss as admin" : "Make admin"}
                            onClick={() => handleToggleAdminStatus(member.id)}
                            className="w-7 h-7"
                          >
                            <Shield className={`w-3.5 h-3.5 ${isMemberAdmin ? 'text-primary-500 fill-current' : 'text-text-secondary'}`} />
                          </IconButton>
                          
                          <IconButton
                            label="Remove member"
                            onClick={() => handleRemoveMemberClick(member.id, member.username)}
                            className="w-7 h-7 hover:text-error hover:bg-error/5"
                          >
                            <X className="w-3.5 h-3.5 text-text-secondary" />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Actions */}
          <div className="border-t border-border pt-6 space-y-3">
            <button
              onClick={handleLeaveClick}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-error/20 bg-error/5 text-error text-sm font-semibold hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Exit Group
            </button>
            
            {isAdmin && (
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Members Overlay Slide-in */}
      <AnimatePresence>
        {isAddingMembers && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="absolute inset-0 z-50 bg-background flex flex-col"
          >
            <header className="flex items-center justify-between px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
              <div className="flex items-center gap-4">
                <IconButton label="Back" onClick={() => setIsAddingMembers(false)}>
                  <ArrowLeft className="w-5 h-5" />
                </IconButton>
                <h2 className="text-lg font-semibold text-text-primary">Add Participants</h2>
              </div>
              {selectedContactIds.size > 0 && (
                <button 
                  onClick={handleAddSelectedMembers}
                  className="text-sm font-semibold text-primary-500 hover:underline"
                >
                  Done
                </button>
              )}
            </header>

            <div className="px-3 py-2 border-b border-border shrink-0">
              <input
                type="text"
                placeholder="Search contacts"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full h-9 px-4 rounded-xl bg-surface-hover text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all border border-transparent focus:border-primary-500/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredAddableContacts.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-muted">
                  No contacts available to add
                </div>
              ) : (
                filteredAddableContacts.map(c => {
                  const isSelected = selectedContactIds.has(c.contactUser.id);
                  return (
                    <button
                      key={c.contactUser.id}
                      onClick={() => handleToggleAddable(c.contactUser.id)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-hover transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={c.contactUser.avatarUrl} fallback={getContactName(c.contactUser.id || (c.contactUser as any)._id, c.contactUser)} size="md" />
                        <div>
                          <h4 className="text-text-primary font-medium text-[15px]">
                            {getContactName(c.contactUser.id || (c.contactUser as any)._id, c.contactUser)}
                          </h4>
                          <p className="text-xs text-text-muted">@{c.contactUser.username}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-accent border-accent text-white' : 'border-border'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Dialog */}
      <Dialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        title={
          confirmDialog.type === 'delete' ? 'Delete Group' :
          confirmDialog.type === 'leave' ? 'Exit Group' : 'Remove Member'
        }
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            {confirmDialog.type === 'delete' && 'Are you sure you want to delete this group? This action is permanent and cannot be undone.'}
            {confirmDialog.type === 'leave' && 'Are you sure you want to leave this group?'}
            {confirmDialog.type === 'remove' && `Are you sure you want to remove @${confirmDialog.targetUserName} from the group?`}
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <Button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="bg-transparent border-none text-text-primary hover:bg-surface-hover">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                const { type, targetUserId } = confirmDialog;
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                if (type === 'delete') {
                  await executeDelete();
                } else if (type === 'leave' || type === 'remove') {
                  if (targetUserId) await executeRemoveMember(targetUserId);
                }
              }}
              className="bg-[#f43f5e] hover:bg-[#e11d48] text-white"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
