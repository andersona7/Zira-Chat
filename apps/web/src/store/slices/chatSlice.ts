import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Chat } from '@zira/types';

export interface ChatState {
  activeChatId: string | null;
  typingUsers: Record<string, boolean>; // chatId -> isTyping
  unlockedChats: string[]; // List of chatIds that have been unlocked in this session
  isLockerUnlocked: boolean;
  lockerToken: string | null;
}

const initialState: ChatState = {
  activeChatId: null,
  typingUsers: {},
  unlockedChats: [],
  isLockerUnlocked: false,
  lockerToken: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<Chat | string | null>) => {
      if (!action.payload) {
        state.activeChatId = null;
      } else if (typeof action.payload === 'string') {
        state.activeChatId = action.payload;
      } else {
        state.activeChatId = action.payload.id;
      }
    },
    setTypingState: (state, action: PayloadAction<{ chatId: string; isTyping: boolean }>) => {
      if (!state.typingUsers) {
        state.typingUsers = {};
      }
      state.typingUsers[action.payload.chatId] = action.payload.isTyping;
    },
    unlockChatSession: (state, action: PayloadAction<string>) => {
      if (!state.unlockedChats.includes(action.payload)) {
        state.unlockedChats.push(action.payload);
      }
    },
    lockChatSession: (state, action: PayloadAction<string>) => {
      state.unlockedChats = state.unlockedChats.filter(id => id !== action.payload);
    },
    setLockerUnlocked: (state, action: PayloadAction<{ unlocked: boolean; token: string | null }>) => {
      state.isLockerUnlocked = action.payload.unlocked;
      state.lockerToken = action.payload.token;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload && action.payload.chat) {
        const hydrated = action.payload.chat;
        let activeChatId = hydrated.activeChatId || null;
        if (!activeChatId && hydrated.activeChat) {
          activeChatId = hydrated.activeChat.id || null;
        }
        return {
          ...state,
          ...hydrated,
          activeChatId,
          activeChat: undefined,
          isLockerUnlocked: false,
          lockerToken: null,
        };
      }
      return state;
    });
  },
});

export const { setActiveChat, setTypingState, unlockChatSession, lockChatSession, setLockerUnlocked } = chatSlice.actions;
export default chatSlice.reducer;