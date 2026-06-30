import { RootState } from './index';
import { chatApi } from './api/chatApi';
import type { Chat } from '@zira/types';

export const selectActiveChatId = (state: RootState): string | null => state.chat.activeChatId;

export const selectActiveChat = (state: RootState): Chat | null => {
  const activeId = state.chat.activeChatId;
  if (!activeId) return null;
  const chatsResult = chatApi.endpoints.getChats.select()(state);
  const chats = chatsResult?.data?.data || [];
  return chats.find((c: any) => c.id === activeId) || null;
};
