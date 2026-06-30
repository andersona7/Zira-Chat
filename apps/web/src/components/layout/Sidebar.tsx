import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useLogoutUserMutation } from '@/store/api/authApi';
import { logout } from '@/store/slices/authSlice';
import { Avatar, IconButton, Dialog, Button } from '@zira/ui';
import { SecureMedia } from '../common/SecureMedia';
import { MessageSquare, MoreVertical, Search, LogOut, Users, CircleDashed, Settings, WifiOff, Phone, Sun, Moon, ChevronLeft, X } from 'lucide-react';
import { ProfilePanel } from '../profile/ProfilePanel';
import { NewChatPanel } from '../contacts/NewChatPanel';
import { CreateGroupPanel } from '../groups/CreateGroupPanel';
import { StatusPanel } from '../status/StatusPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { CallHistoryPanel } from '../call/CallHistoryPanel';
import { ChatList } from '../chat/ChatList';
import { useNetwork } from '@/hooks/useNetwork';
import { useTheme } from '@/components/theme/ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandLogo } from '../ui/BrandLogo';

interface SidebarProps {
  onChatSelected?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onChatSelected, isCollapsed, onToggleCollapse }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const [logoutUser] = useLogoutUserMutation();
  const { isOnline } = useNetwork();
  const { resolvedTheme, toggleTheme } = useTheme();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCallsOpen, setIsCallsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = async () => {
    setIsLogoutDialogOpen(false);
    await logoutUser();
    dispatch(logout());
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-sidebar">
      {/* Header */}
      {isCollapsed ? (
        <header className="flex flex-col items-center justify-center py-4 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0 z-30">
          <BrandLogo
            size="sm"
            onClick={onToggleCollapse}
            className="cursor-pointer hover:scale-105 transition-transform"
          />
        </header>
      ) : (
        <header className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <SecureMedia
              type="avatar"
              fallback={user?.displayName || 'User'}
              src={user?.avatarUrl}
              onClick={() => setIsProfileOpen(true)}
              className="cursor-pointer hover:ring-secondary/30 ring-offset-2 ring-offset-background"
            />
            {onToggleCollapse && (
              <IconButton label="Collapse sidebar" onClick={onToggleCollapse} className="w-8 h-8 hidden md:flex text-text-muted hover:text-text-primary bg-transparent hover:shadow-neo-out-sm border-none">
                <ChevronLeft className="w-4.5 h-4.5" />
              </IconButton>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 relative">
            <IconButton label="Toggle theme" onClick={toggleTheme} className="w-9 h-9 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary">
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </IconButton>

            <IconButton label="Status" onClick={() => setIsStatusOpen(true)} className="w-9 h-9 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary">
              <CircleDashed className="w-5 h-5" />
            </IconButton>

            <IconButton label="Calls" onClick={() => setIsCallsOpen(true)} className="w-9 h-9 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary">
              <Phone className="w-5 h-5" />
            </IconButton>

            <IconButton label="New Chat" onClick={() => setIsNewChatOpen(true)} className="w-9 h-9 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary">
              <MessageSquare className="w-5 h-5" />
            </IconButton>
            
            <div className="relative font-sans" ref={menuRef}>
              <IconButton label="Menu" onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 bg-transparent hover:shadow-neo-out-sm border-none text-text-secondary hover:text-text-primary">
                <MoreVertical className="w-5 h-5" />
              </IconButton>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                    className="absolute top-full right-0 mt-2.5 w-52 bg-card rounded-2xl shadow-neo-out-lg z-50 overflow-hidden py-2 border border-white/20 flex flex-col gap-0.5"
                  >
                    <button 
                      onClick={() => { setShowMenu(false); setIsCreateGroupOpen(true); }}
                      className="w-[calc(100%-12px)] mx-1.5 text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-composer hover:shadow-neo-in-sm rounded-xl transition-all duration-200 flex items-center gap-3"
                    >
                      <Users className="w-4 h-4 text-text-secondary" />
                      New group
                    </button>
                    <button 
                      onClick={() => { setShowMenu(false); setIsSettingsOpen(true); }}
                      className="w-[calc(100%-12px)] mx-1.5 text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-composer hover:shadow-neo-in-sm rounded-xl transition-all duration-200 flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4 text-text-secondary" />
                      Settings
                    </button>
                    <div className="h-px bg-black/5 dark:bg-white/5 mx-2 my-1" />
                    <button 
                      onClick={() => { setShowMenu(false); setIsLogoutDialogOpen(true); }}
                      className="w-[calc(100%-12px)] mx-1.5 text-left px-3 py-2 text-sm font-semibold text-error hover:bg-error/5 hover:shadow-neo-in-sm rounded-xl transition-all duration-200 flex items-center gap-3"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      )}

      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-error/10 px-5 py-2.5 flex items-center justify-center gap-2 border-b border-error/20 shrink-0"
          >
            <WifiOff className="w-4 h-4 text-error" />
            {!isCollapsed && <span className="text-xs text-error font-semibold uppercase tracking-wider">Computer disconnected</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4.5 py-3 border-b border-black/5 dark:border-white/5 shrink-0 bg-transparent">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full h-10 pl-10.5 pr-10 rounded-xl neo-in-sm text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <ChatList onChatSelected={onChatSelected} isCollapsed={isCollapsed} searchQuery={searchQuery} />

      {/* Slide-in Panels */}
      <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <NewChatPanel isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <CreateGroupPanel isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <StatusPanel isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CallHistoryPanel isOpen={isCallsOpen} onClose={() => setIsCallsOpen(false)} />

      {/* Logout Confirmation Dialog */}
      <Dialog isOpen={isLogoutDialogOpen} onClose={() => setIsLogoutDialogOpen(false)} title="Log Out">
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">Are you sure you want to log out of Zira Chat?</p>
          <div className="flex justify-end gap-3.5 mt-5">
            <Button variant="ghost" onClick={() => setIsLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
// Force reload comment