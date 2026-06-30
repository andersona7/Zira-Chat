import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { Avatar, IconButton } from '@zira/ui';
import { useGetStatusesQuery } from '@/store/api/statusApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { format } from 'date-fns';
import { cn } from '@zira/utils';
import { StatusViewer } from './StatusViewer';
import { CreateStatusModal } from './CreateStatusModal';
import { useContactNames } from '@/hooks/useContactNames';

interface StatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ isOpen, onClose }) => {
  const { data, isLoading } = useGetStatusesQuery(undefined, { skip: !isOpen });
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { getContactName } = useContactNames();
  
  const [viewerData, setViewerData] = useState<{ active: boolean; index: number }>({ active: false, index: 0 });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const groups = data?.data || [];
  const myGroup = groups.find(g => g.user.id === currentUser?.id);
  const otherGroups = groups.filter(g => g.user.id !== currentUser?.id);
  
  const recentUpdates = otherGroups.filter(g => !g.isAllViewed);
  const viewedUpdates = otherGroups.filter(g => g.isAllViewed);

  const openViewer = (groupIndex: number) => {
    setViewerData({ active: true, index: groupIndex });
  };

  const renderGroup = (group: typeof myGroup, idx: number) => {
    if (!group) return null;
    const latest = group.statuses[group.statuses.length - 1];
    
    const isAllViewed = group.isAllViewed || group.user.id === currentUser?.id;
    const ringColor = isAllViewed ? 'border-black/10 dark:border-white/10' : 'border-secondary';

    return (
      <button
        key={group.user.id}
        className="flex items-center gap-4 w-full px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left"
        onClick={() => openViewer(idx)}
      >
        <div className={cn("relative rounded-full border-2 p-0.5 flex items-center justify-center shrink-0", ringColor)}>
           <Avatar src={group.user.avatarUrl} fallback={getContactName(group.user.id || (group.user as any)._id, group.user)} size="lg" className="ring-0" />
        </div>
        <div className="flex-1 border-b border-black/5 dark:border-white/5 pb-3 group-last:border-none">
          <h4 className="text-text-primary font-medium text-[15px]">
            {group.user.id === currentUser?.id ? 'My status' : getContactName(group.user.id || (group.user as any)._id, group.user)}
          </h4>
          <p className="text-text-muted text-sm">
            {format(new Date(latest.createdAt), 'hh:mm a')}
          </p>
        </div>
      </button>
    );
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
          className="absolute inset-1.5 z-40 flex flex-col bg-panel rounded-xl shadow-neo-out-md border border-white/20 overflow-hidden"
        >
          {/* Header */}
          <header className="flex items-center gap-4 px-4 py-3 border-b border-black/5 dark:border-white/5 h-[65px] shrink-0">
            <IconButton label="Back" onClick={onClose} className="bg-transparent border-none">
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <h2 className="text-lg font-bold text-text-primary">Status</h2>
          </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* My Status */}
              <div className="py-2">
                {myGroup ? renderGroup(myGroup, groups.findIndex(g => g.user.id === currentUser?.id)) : (
                  <button
                    className="flex items-center gap-4 w-full px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <div className="relative">
                       <Avatar src={currentUser?.avatarUrl} fallback={currentUser?.displayName || '?'} size="lg" />
                       <div className="absolute -bottom-1 -right-1 bg-secondary rounded-full p-0.5 border-2 border-panel">
                         <Plus className="w-3 h-3 text-white" />
                       </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-text-primary font-medium text-[15px]">My status</h4>
                      <p className="text-text-muted text-sm">Click to add status update</p>
                    </div>
                  </button>
                )}
              </div>

              {isLoading && <div className="p-4 text-center text-text-muted text-sm">Loading statuses...</div>}

              {/* Recent Updates */}
              {recentUpdates.length > 0 && (
                <div className="mt-4">
                  <div className="px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Recent updates
                  </div>
                  {recentUpdates.map(g => renderGroup(g, groups.indexOf(g)))}
                </div>
              )}

              {/* Viewed Updates */}
              {viewedUpdates.length > 0 && (
                <div className="mt-4">
                  <div className="px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Viewed updates
                  </div>
                  {viewedUpdates.map(g => renderGroup(g, groups.indexOf(g)))}
                </div>
              )}
            </div>
            
            {/* Floating FAB to add status */}
             <div className="absolute bottom-6 right-6 z-10">
                <IconButton 
                  label="Add Status" 
                  onClick={() => setIsCreateOpen(true)}
                  className="w-14 h-14 bg-secondary text-white hover:bg-secondary/90 shadow-neo-out-md border border-white/10 rounded-2xl"
                >
                  <Plus className="w-6 h-6" />
                </IconButton>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <CreateStatusModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {viewerData.active && (
        <StatusViewer 
          groups={groups} 
          initialGroupIndex={viewerData.index}
          currentUserId={currentUser?.id || ''}
          onClose={() => setViewerData({ active: false, index: 0 })}
        />
      )}
    </>
  );
};