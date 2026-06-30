import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Edit2, Check, X } from 'lucide-react';
import { Avatar, IconButton, Input, Button } from '@zira/ui';
import { SecureMedia } from '../common/SecureMedia';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useUpdateProfileMutation } from '@/store/api/userApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import { setCredentials } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ isOpen, onClose }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [about, setAbout] = useState(user?.about || '');

  const handleSave = async () => {
    try {
      const result = await updateProfile({ displayName, about }).unwrap();
      if (result.success && result.data && token) {
        dispatch(setCredentials({ user: result.data, accessToken: token }));
        toast.success('Profile updated');
        setIsEditing(false);
      }
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResult = await uploadMedia(formData).unwrap();
      if (uploadResult.success && uploadResult.data) {
        const result = await updateProfile({ avatarUrl: uploadResult.data.url }).unwrap();
        if (result.success && result.data && token) {
          dispatch(setCredentials({ user: result.data, accessToken: token }));
          toast.success('Avatar updated');
        }
      }
    } catch (err) {
      toast.error('Failed to update avatar');
    }
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
            <IconButton label="Back" onClick={onClose} className="bg-transparent border-none">
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Profile</h2>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Avatar Section */}
            <div className="flex flex-col items-center py-8 px-6">
              <div className="relative group">
                <SecureMedia
                  type="avatar"
                  src={user?.avatarUrl}
                  fallback={user?.displayName || '?'}
                  size="2xl"
                  className="!w-32 !h-32 !text-4xl ring-4 ring-secondary/20 ring-offset-2 ring-offset-background"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1 text-white"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-semibold">Change</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="px-6 space-y-6">
              <div className="bg-card rounded-2xl border border-white/20 p-5 space-y-5 shadow-neo-out-sm">
                {isEditing ? (
                  <>
                    <Input
                      label="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={25}
                      autoFocus
                    />
                    <Input
                      label="About"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      maxLength={140}
                      placeholder="Write something about yourself..."
                    />
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} isLoading={isLoading} className="flex-1">
                        <Check className="w-4 h-4" /> Save
                      </Button>
                      <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Name</p>
                        <p className="text-text-primary font-medium">{user?.displayName}</p>
                      </div>
                      <IconButton label="Edit" onClick={() => { setDisplayName(user?.displayName || ''); setAbout(user?.about || ''); setIsEditing(true); }} className="w-8 h-8">
                        <Edit2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                    <div className="border-t border-black/5 dark:border-white/5 pt-4">
                      <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">About</p>
                      <p className="text-text-secondary text-sm">{user?.about || 'Hey there! I am using Zira Chat.'}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-card rounded-2xl border border-white/25 p-5 space-y-3 shadow-neo-out-sm">
                <div>
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Username</p>
                  <p className="text-text-primary text-sm font-mono">@{user?.username}</p>
                </div>
                <div className="border-t border-black/5 dark:border-white/5 pt-3">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Email</p>
                  <p className="text-text-primary text-sm">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
// Force reload comment