import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, MessageSquare, ArrowLeft } from 'lucide-react';
import { IconButton } from '@zira/ui';
import type { Message } from '@zira/types';

interface SearchMessagesPanelProps {
  onClose: () => void;
  messages: Message[];
  onScrollToMessage: (messageId: string) => void;
  getContactName: (senderId: string) => string;
}

export const SearchMessagesPanel: React.FC<SearchMessagesPanelProps> = ({
  onClose,
  messages,
  onScrollToMessage,
  getContactName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.type === 'TEXT' &&
        m.content &&
        m.content.toLowerCase().includes(q)
    );
  }, [searchQuery, messages]);

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
        <IconButton label="Close panel" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <h2 className="text-lg font-semibold text-text-primary">Search Messages</h2>
      </header>

      {/* Search Input */}
      <div className="p-4 border-b border-border bg-background/50 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all border border-border focus:border-primary-500/30"
            autoFocus
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

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {!searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted space-y-2">
            <Search className="w-8 h-8 opacity-40" />
            <p className="text-sm">Search for keywords, phrases, or text</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-sm">No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
              Found {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </div>
            <div className="space-y-2">
              {filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => onScrollToMessage(msg.id)}
                  className="w-full text-left p-3 rounded-xl bg-background hover:bg-surface-hover border border-border/50 hover:border-border transition-all flex flex-col gap-1.5 focus:outline-none"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-primary-500">
                      {getContactName(msg.senderId)}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
