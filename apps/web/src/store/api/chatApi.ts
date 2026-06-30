import { baseApi } from './baseQuery';
import type { Chat, Message, ApiResponse } from '@zira/types';

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChats: builder.query<ApiResponse<Chat[]>, void>({
      query: () => '/chats',
      providesTags: ['Chat'],
    }),
    createDirectChat: builder.mutation<ApiResponse<Chat>, string>({
      query: (targetUserId) => ({
        url: '/chats/direct',
        method: 'POST',
        body: { targetUserId },
      }),
      invalidatesTags: ['Chat'],
    }),
    createGroupChat: builder.mutation<ApiResponse<Chat>, { name: string; participantIds: string[] }>({
      query: (data) => ({
        url: '/chats/group',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Chat'],
    }),
    // OPTIMIZED: Handles cursor pagination and cache merging
    getMessages: builder.query<ApiResponse<MessagesResponse>, { chatId: string; cursor?: string | null }>({
      query: ({ chatId, cursor }) => {
        let url = `/chats/${chatId}/messages`;
        if (cursor) url += `?cursor=${cursor}`;
        return url;
      },
      providesTags: ['Message'],
      // Force individual cache entries based on chatId only, merging older pages in
      serializeQueryArgs: ({ queryArgs }) => {
        return queryArgs.chatId;
      },
      // Merge new incoming data (older messages) with existing cache
      merge: (currentCache, newItems, { arg }) => {
        if (arg.cursor) {
          // Prepend older messages fetched via cursor
          currentCache.data!.messages.unshift(...newItems.data!.messages);
          currentCache.data!.nextCursor = newItems.data!.nextCursor;
        } else {
          // Initial load or refresh, replace cache
          currentCache.data = newItems.data;
        }
      },
      // Refetch if the query arg changes to undefined (e.g., pulling first page again)
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.cursor !== previousArg?.cursor;
      },
    }),
    updateGroup: builder.mutation<ApiResponse<Chat>, { chatId: string; name?: string; description?: string; avatarUrl?: string }>({
      query: ({ chatId, ...body }) => ({
        url: `/chats/${chatId}/group`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Chat'],
    }),
    addParticipants: builder.mutation<ApiResponse<Chat>, { chatId: string; participantIds: string[] }>({
      query: ({ chatId, participantIds }) => ({
        url: `/chats/${chatId}/participants`,
        method: 'POST',
        body: { participantIds },
      }),
      invalidatesTags: ['Chat'],
    }),
    removeParticipant: builder.mutation<ApiResponse<Chat>, { chatId: string; userId: string }>({
      query: ({ chatId, userId }) => ({
        url: `/chats/${chatId}/participants/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),
    toggleAdmin: builder.mutation<ApiResponse<Chat>, { chatId: string; targetUserId: string }>({
      query: ({ chatId, targetUserId }) => ({
        url: `/chats/${chatId}/admins`,
        method: 'PATCH',
        body: { targetUserId },
      }),
      invalidatesTags: ['Chat'],
    }),
    deleteGroup: builder.mutation<ApiResponse<void>, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),
    clearChat: builder.mutation<ApiResponse<void>, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/clear`,
        method: 'POST',
      }),
      invalidatesTags: ['Chat', 'Message'],
      async onQueryStarted(chatId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getMessages', { chatId } as any, (draft) => {
            if (draft && draft.data) {
              draft.data.messages = [];
              draft.data.nextCursor = null;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    unlockChat: builder.mutation<ApiResponse<void>, { chatId: string; pin: string }>({
      query: ({ chatId, pin }) => ({
        url: `/chats/${chatId}/unlock`,
        method: 'POST',
        body: { pin },
      }),
      invalidatesTags: ['Chat'],
    }),
    setupLockPin: builder.mutation<ApiResponse<void>, { pin: string; chatId?: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/setup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Chat'],
    }),
    verifyLockerPin: builder.mutation<ApiResponse<{ lockerToken: string }>, { pin: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/verify',
        method: 'POST',
        body: data,
      }),
    }),
    changeLockPin: builder.mutation<ApiResponse<void>, { currentPin: string; newPin: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/change',
        method: 'POST',
        body: data,
      }),
    }),
    requestLockPinResetCode: builder.mutation<ApiResponse<void>, void>({
      query: () => ({
        url: '/chats/lock-settings/reset-request',
        method: 'POST',
      }),
    }),
    verifyLockResetOtp: builder.mutation<ApiResponse<void>, { otp: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyPasswordForLockReset: builder.mutation<ApiResponse<void>, { password: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/verify-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetLockPin: builder.mutation<ApiResponse<void>, { newPin: string }>({
      query: (data) => ({
        url: '/chats/lock-settings/reset-confirm',
        method: 'POST',
        body: data,
      }),
    }),
    lockChat: builder.mutation<ApiResponse<void>, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/lock`,
        method: 'POST',
      }),
      invalidatesTags: ['Chat'],
    }),
    getSharedMedia: builder.query<ApiResponse<{ items: any[]; counts: { media: number; documents: number; links: number }; pagination: { page: number; limit: number; totalCount: number; hasMore: boolean } }>, { chatId: string; type?: string; page?: number; limit?: number; search?: string }>({
      query: ({ chatId, type, page = 1, limit = 20, search }) => {
        let url = `/chats/${chatId}/shared-media?type=${type || 'media'}&page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return url;
      },
    }),
    getMessageInfo: builder.query<ApiResponse<any>, { chatId: string; messageId: string }>({
      query: ({ chatId, messageId }) => `/chats/${chatId}/messages/${messageId}/info`,
    }),
  }),
});

export const { 
  useGetChatsQuery, 
  useCreateDirectChatMutation, 
  useCreateGroupChatMutation, 
  useGetMessagesQuery,
  useUpdateGroupMutation,
  useAddParticipantsMutation,
  useRemoveParticipantMutation,
  useToggleAdminMutation,
  useDeleteGroupMutation,
  useClearChatMutation,
  useUnlockChatMutation,
  useSetupLockPinMutation,
  useVerifyLockerPinMutation,
  useChangeLockPinMutation,
  useRequestLockPinResetCodeMutation,
  useVerifyLockResetOtpMutation,
  useVerifyPasswordForLockResetMutation,
  useResetLockPinMutation,
  useLockChatMutation,
  useGetSharedMediaQuery,
  useGetMessageInfoQuery
} = chatApi;