import { useDispatch } from 'react-redux';
import { setActiveChat, setLockerUnlocked } from '@/store/slices/chatSlice';
import { chatApi } from '@/store/api/chatApi';
import { clearDraft } from './useChatComposerFocus';

export function useExitLockedChat() {
  const dispatch = useDispatch();

  const exitLockedChat = (chatId: string) => {
    // 1. Remove active chat from state – return to chat list
    dispatch(setActiveChat(null));

    // 2. Close the account-level locker session entirely (re-locks ALL locked chats)
    dispatch(setLockerUnlocked({ unlocked: false, token: null }));

    // 3. Clear sensitive composer draft for security cleanup
    clearDraft(chatId);

    // 4. Overwrite RTK Query cache to securely wipe message history
    (dispatch as any)(
      chatApi.util.updateQueryData('getMessages', { chatId } as any, (draft: any) => {
        if (draft) draft.data = { messages: [], nextCursor: null };
      })
    );
    (dispatch as any)(
      chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, (draft: any) => {
        if (draft) draft.data = { messages: [], nextCursor: null };
      })
    );
    (dispatch as any)(
      chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, (draft: any) => {
        if (draft) draft.data = { messages: [], nextCursor: null };
      })
    );

    // 5. Invalidate tags to force refetch (will skip if locked)
    (dispatch as any)(chatApi.util.invalidateTags([{ type: 'Message', id: chatId }]));
  };

  return exitLockedChat;
}
