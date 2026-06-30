import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, MoreVertical } from 'lucide-react';
import { Avatar, IconButton, Dialog, Button } from '@zira/ui';
import { useGetCallsQuery, useDeleteCallMutation, useClearCallsMutation } from '@/store/api/callApi';
import { format } from 'date-fns';
import { useContactNames } from '@/hooks/useContactNames';

interface CallHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'ALL' | 'MISSED';

export const CallHistoryPanel: React.FC<CallHistoryPanelProps> = ({ isOpen, onClose }) => {
  const { data, isLoading, refetch } = useGetCallsQuery(undefined, { skip: !isOpen });
  const [deleteCall] = useDeleteCallMutation();
  const [clearCalls] = useClearCallsMutation();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showMenu, setShowMenu] = useState(false);
  const [isClearLogDialogOpen, setIsClearLogDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getContactName } = useContactNames();

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

  const rawCalls = data?.data || [];
  
  const filteredCalls = rawCalls.filter(call => {
    if (filter === 'MISSED') {
      return call.status === 'MISSED' || call.status === 'REJECTED';
    }
    return true;
  });

  const handleDeleteCall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCall(id).unwrap();
    } catch (err) {
      console.error('Failed to delete call log:', err);
    }
  };

  const handleClearAllClick = () => {
    setShowMenu(false);
    setIsClearLogDialogOpen(true);
  };

  const confirmClearAll = async () => {
    try {
      await clearCalls().unwrap();
      setIsClearLogDialogOpen(false);
    } catch (err) {
      console.error('Failed to clear call history:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-105%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-105%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-1.5 z-40 flex flex-col bg-panel rounded-xl shadow-neo-out-md border border-white/20 overflow-hidden"
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0 relative">
            <div className="flex items-center gap-4">
              <IconButton label="Back" onClick={onClose} className="bg-transparent border-none">
                <ArrowLeft className="w-5 h-5" />
              </IconButton>
              <h2 className="text-lg font-bold text-text-primary">Calls</h2>
            </div>
            <div className="relative" ref={menuRef}>
              <IconButton label="Call Options" onClick={() => setShowMenu(!showMenu)} className="bg-transparent border-none">
                <MoreVertical className="w-5 h-5" />
              </IconButton>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-white/20 rounded-xl shadow-neo-out-md z-50 overflow-hidden py-1"
                  >
                    <button
                      onClick={handleClearAllClick}
                      className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors flex items-center gap-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear call log
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Filters */}
          <div className="flex gap-2 px-4 py-3 border-b border-black/5 dark:border-white/5 bg-transparent shrink-0">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-secondary text-white shadow-neo-out-sm border border-white/10'
                  : 'bg-card text-text-secondary hover:text-text-primary shadow-neo-out-sm border border-white/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('MISSED')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filter === 'MISSED'
                  ? 'bg-error text-white shadow-neo-out-sm border border-white/10'
                  : 'bg-card text-text-secondary hover:text-text-primary shadow-neo-out-sm border border-white/20'
              }`}
            >
              Missed
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && filteredCalls.length === 0 && (
              <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                <Phone className="w-8 h-8 opacity-40" />
                <span>No call logs found</span>
              </div>
            )}

            {!isLoading &&
              filteredCalls.map((call) => {
                const isMissed = call.status === 'MISSED' || call.status === 'REJECTED';
                
                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/5 dark:border-white/5 last:border-0 group transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar
                        src={call.contactUser.avatarUrl}
                        fallback={getContactName(call.contactUser.id || (call.contactUser as any)._id, call.contactUser.displayName)}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className={`font-medium text-[15px] truncate ${isMissed ? 'text-error' : 'text-text-primary'}`}>
                          {getContactName(call.contactUser.id || (call.contactUser as any)._id, call.contactUser.displayName)}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                          {call.isOutgoing ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-success" />
                          ) : isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-error" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-accent" />
                          )}
                          <span>
                            {format(new Date(call.createdAt), 'hh:mm a')} • {format(new Date(call.createdAt), 'MMM dd')}
                          </span>
                          {call.status === 'CONNECTED' && (
                            <span className="text-text-muted">• {formatDuration(call.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-text-muted">
                        {call.type === 'VIDEO' ? (
                          <Video className="w-5 h-5" />
                        ) : (
                          <Phone className="w-5 h-5" />
                        )}
                      </div>
                      <IconButton
                        label="Delete Log"
                        onClick={(e) => handleDeleteCall(call.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:bg-error/10 w-8 h-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Clear Call Log Confirmation Dialog */}
          <Dialog
            isOpen={isClearLogDialogOpen}
            onClose={() => setIsClearLogDialogOpen(false)}
            title="Clear Call Log"
          >
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Are you sure you want to clear all call history? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setIsClearLogDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmClearAll}>
                  Clear All
                </Button>
              </div>
            </div>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
