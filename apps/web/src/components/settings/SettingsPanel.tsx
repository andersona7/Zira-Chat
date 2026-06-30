import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, Volume2, Moon, Lock, Sun, Trash2 } from 'lucide-react';
import { Avatar, IconButton, Toggle, Button, Dialog, Input } from '@zira/ui';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useUpdateProfileMutation, useRequestDeleteAccountMutation } from '@/store/api/userApi';
import { setCredentials, logout } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';
import { PrivacyPanel } from './PrivacyPanel';
import { BlockedUsersPanel } from './BlockedUsersPanel';
import { SecurityPanel } from './SecurityPanel';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Shield } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [updateProfile] = useUpdateProfileMutation();
  const [requestDelete, { isLoading: isRequestingDelete }] = useRequestDeleteAccountMutation();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [activeView, setActiveView] = useState<'MAIN' | 'PRIVACY' | 'BLOCKED' | 'SECURITY'>('MAIN');
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  if (!user) return null;

  const handleUpdateSetting = async (key: 'sound' | 'browser', value: boolean) => {
    try {
      if (key === 'browser' && value === true) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return toast.error('Browser blocked notification permission');
      }
      const res = await updateProfile({
        settings: {
          ...user.settings,
          notifications: { ...user.settings.notifications, [key]: value }
        }
      }).unwrap();
      if (res.success && res.data && token) {
        dispatch(setCredentials({ user: res.data, accessToken: token }));
      }
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Password is required');
      return;
    }
    try {
      const res = await requestDelete({ password: deletePassword }).unwrap();
      if (res.success) {
        toast.success(res.message || 'Confirmation email sent. Check your inbox.');
        setIsDeleteAccountOpen(false);
        setDeletePassword('');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to request account deletion');
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
            <div className="flex items-end h-[108px] px-4 pb-4 shrink-0 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-6 w-full text-text-primary">
                <IconButton label="Back" onClick={onClose} className="bg-transparent border-none">
                  <ArrowLeft className="w-6 h-6" />
                </IconButton>
                <h2 className="text-xl font-bold tracking-tight">Settings</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Profile Overview inside Settings */}
              <div className="flex items-center gap-4 pb-6 border-b border-black/5 dark:border-white/5">
                <Avatar src={user.avatarUrl} fallback={user.displayName} size="xl" />
                <div>
                  <h3 className="text-xl text-text-primary font-medium">{user.displayName}</h3>
                  <p className="text-text-secondary text-sm mt-1">{user.about}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveView('PRIVACY')}
                  className="w-full flex items-center justify-between py-4 group"
                >
                  <div className="flex items-center gap-4">
                    <Lock className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                    <p className="text-text-primary font-medium group-hover:text-text-primary transition-colors">Privacy</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>

                <button 
                  onClick={() => setActiveView('SECURITY')}
                  className="w-full flex items-center justify-between py-4 group border-t border-black/5 dark:border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <Shield className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                    <p className="text-text-primary font-medium group-hover:text-text-primary transition-colors">Security & Devices</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Notifications Section */}
              <div className="pt-6 border-t border-black/5 dark:border-white/5">
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Notifications</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Volume2 className="w-5 h-5 text-text-secondary" />
                      <div>
                        <p className="text-text-primary font-medium">Sounds</p>
                        <p className="text-xs text-text-secondary mt-0.5">Play sounds for incoming messages</p>
                      </div>
                    </div>
                    <Toggle enabled={user.settings.notifications.sound} onChange={(val) => handleUpdateSetting('sound', val)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Bell className="w-5 h-5 text-text-secondary" />
                      <div>
                        <p className="text-text-primary font-medium">Browser Alerts</p>
                        <p className="text-xs text-text-secondary mt-0.5">Show push notifications</p>
                      </div>
                    </div>
                    <Toggle enabled={user.settings.notifications.browser} onChange={(val) => handleUpdateSetting('browser', val)} />
                  </div>
                </div>
              </div>

              {/* Appearance Section */}
              <div className="pt-6 border-t border-black/5 dark:border-white/5">
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Appearance</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {resolvedTheme === 'dark' ? <Moon className="w-5 h-5 text-text-secondary" /> : <Sun className="w-5 h-5 text-text-secondary" />}
                    <div>
                      <p className="text-text-primary font-medium">Dark Theme</p>
                      <p className="text-xs text-text-secondary mt-0.5">Switch between dark and light themes</p>
                    </div>
                  </div>
                  <Toggle enabled={resolvedTheme === 'dark'} onChange={toggleTheme} />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-black/5 dark:border-white/5">
                <h3 className="text-sm font-medium text-error uppercase tracking-wider mb-4">Danger Zone</h3>
                <button
                  onClick={() => setIsDeleteAccountOpen(true)}
                  className="w-full flex items-center justify-between py-2.5 text-left text-error hover:bg-error/5 rounded-xl px-3 -mx-3 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <Trash2 className="w-5 h-5 text-error" />
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-xs text-text-secondary mt-0.5">Permanently delete your Zira Chat account</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PrivacyPanel 
        key="privacy-panel"
        isOpen={activeView === 'PRIVACY'} 
        onBack={() => setActiveView('MAIN')} 
        onOpenBlocked={() => setActiveView('BLOCKED')}
      />

      <BlockedUsersPanel 
        key="blocked-users-panel"
        isOpen={activeView === 'BLOCKED'} 
        onBack={() => setActiveView('PRIVACY')} 
      />

      <SecurityPanel
        key="security-panel"
        isOpen={activeView === 'SECURITY'}
        onBack={() => setActiveView('MAIN')}
      />

      {/* Delete Account Confirmation Dialog */}
      <Dialog 
        isOpen={isDeleteAccountOpen} 
        onClose={() => {
          setIsDeleteAccountOpen(false);
          setDeletePassword('');
        }} 
        title="Delete Account"
      >
        <div className="space-y-4 pt-2">
          <p className="text-text-secondary text-sm">
            This action is irreversible and will permanently delete all your chats, messages, and account details. To proceed, please confirm your password:
          </p>
          <div className="pt-2">
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isRequestingDelete}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsDeleteAccountOpen(false);
                setDeletePassword('');
              }} 
              disabled={isRequestingDelete}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount} 
              isLoading={isRequestingDelete}
            >
              Send Confirmation Email
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};