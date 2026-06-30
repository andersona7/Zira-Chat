import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Avatar, IconButton } from '@zira/ui';
import { useGetMeQuery, useUnblockUserMutation } from '@/store/api/userApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';
import { useContactNames } from '@/hooks/useContactNames';

interface BlockedUsersPanelProps {
  isOpen: boolean;
  onBack: () => void;
}

export const BlockedUsersPanel: React.FC<BlockedUsersPanelProps> = ({ isOpen, onBack }) => {
  // Use getMe to fetch the populated blockedUsers list
  const { data, isLoading } = useGetMeQuery(undefined, { skip: !isOpen });
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();
  const dispatch = useDispatch();
  const { getContactName } = useContactNames();

  const blockedUsers = data?.data?.blockedUsers || [];

  const handleUnblock = async (targetId: string, name: string) => {
    try {
      const res = await unblockUser(targetId).unwrap();
      if (res.success) {
        // Redux auth slice requires full user object to update token, but getMe handles cache.
        // We rely on RTK Query invalidation for 'User' tag to refresh UI.
        toast.success(`${name} unblocked`);
      }
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-[70] flex flex-col bg-background border-r border-border"
        >
          <div className="flex items-end h-[108px] bg-surface px-4 pb-4 shrink-0 border-b border-border">
            <div className="flex items-center gap-6 w-full text-text-primary">
              <IconButton label="Back" onClick={onBack}>
                <ArrowLeft className="w-6 h-6" />
              </IconButton>
              <h2 className="text-xl font-medium">Blocked Users</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-text-secondary text-sm">Loading...</div>
            ) : blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full text-text-secondary">
                <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
                <p>No blocked users.</p>
                <p className="text-xs mt-2 opacity-70">Blocked contacts will no longer be able to call you or send you messages.</p>
              </div>
            ) : (
              <div className="py-4">
                <p className="px-6 pb-4 text-xs text-text-secondary leading-relaxed border-b border-border">
                  Blocked contacts will no longer be able to call you or send you messages.
                </p>
                {blockedUsers.map((user: any) => (
                  <div key={user._id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors group">
                    <Avatar src={user.avatarUrl} fallback={getContactName(user._id, user)} size="md" />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-text-primary font-medium truncate">{getContactName(user._id, user)}</h4>
                      <p className="text-text-secondary text-sm truncate">@{user.username}</p>
                    </div>
                    <button 
                      onClick={() => handleUnblock(user._id, getContactName(user._id, user))}
                      disabled={isUnblocking}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-error border border-error/30 hover:bg-error/10 disabled:opacity-50"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};