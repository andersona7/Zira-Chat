import { baseApi } from './baseQuery';
import type { User, ApiResponse } from '@zira/types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<ApiResponse<User>, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<ApiResponse<User>, Partial<User>>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    blockUser: builder.mutation<ApiResponse<{ blockedUsers: string[] }>, string>({
      query: (targetId) => ({
        url: `/users/block/${targetId}`,
        method: 'POST',
      }),
      async onQueryStarted(targetId, { dispatch, getState, queryFulfilled }) {
        const state = getState() as any;
        const currentBlocked = state.auth.user?.blockedUsers || [];
        const newBlocked = [...currentBlocked, targetId];

        // 1. Optimistic Redux auth update
        dispatch({ type: 'auth/updateBlockedUsers', payload: newBlocked });

        // 2. Optimistic RTK Query cache update
        const patchResult = dispatch(
          userApi.util.updateQueryData('getMe', undefined, (draft) => {
            if (draft.data) {
              draft.data.blockedUsers = newBlocked;
            }
          })
        );

        try {
          const { data: response } = await queryFulfilled;
          const blockedUsers = response.data?.blockedUsers;
          if (response.success && blockedUsers) {
            dispatch({ type: 'auth/updateBlockedUsers', payload: blockedUsers });
            dispatch(
              userApi.util.updateQueryData('getMe', undefined, (draft) => {
                if (draft.data) {
                  draft.data.blockedUsers = blockedUsers;
                }
              })
            );
          }
        } catch {
          patchResult.undo();
          dispatch({ type: 'auth/updateBlockedUsers', payload: currentBlocked });
        }
      },
      invalidatesTags: ['User'],
    }),
    unblockUser: builder.mutation<ApiResponse<{ blockedUsers: string[] }>, string>({
      query: (targetId) => ({
        url: `/users/unblock/${targetId}`,
        method: 'POST',
      }),
      async onQueryStarted(targetId, { dispatch, getState, queryFulfilled }) {
        const state = getState() as any;
        const currentBlocked = state.auth.user?.blockedUsers || [];
        const newBlocked = currentBlocked.filter((id: string) => id !== targetId);

        // 1. Optimistic Redux auth update
        dispatch({ type: 'auth/updateBlockedUsers', payload: newBlocked });

        // 2. Optimistic RTK Query cache update
        const patchResult = dispatch(
          userApi.util.updateQueryData('getMe', undefined, (draft) => {
            if (draft.data) {
              draft.data.blockedUsers = newBlocked;
            }
          })
        );

        try {
          const { data: response } = await queryFulfilled;
          const blockedUsers = response.data?.blockedUsers;
          if (response.success && blockedUsers) {
            dispatch({ type: 'auth/updateBlockedUsers', payload: blockedUsers });
            dispatch(
              userApi.util.updateQueryData('getMe', undefined, (draft) => {
                if (draft.data) {
                  draft.data.blockedUsers = blockedUsers;
                }
              })
            );
          }
        } catch {
          patchResult.undo();
          dispatch({ type: 'auth/updateBlockedUsers', payload: currentBlocked });
        }
      },
      invalidatesTags: ['User'],
    }),
    searchUsers: builder.query<ApiResponse<User[]>, string>({
      query: (searchTerm) => `/users/search?q=${encodeURIComponent(searchTerm)}`,
    }),
    requestDeleteAccount: builder.mutation<ApiResponse<void>, { password: string }>({
      query: (data) => ({
        url: '/users/me/delete-request',
        method: 'POST',
        body: data,
      }),
    }),
    confirmDeleteAccount: builder.mutation<ApiResponse<void>, { token: string }>({
      query: (data) => ({
        url: '/users/confirm-delete',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { 
  useGetMeQuery, 
  useUpdateProfileMutation, 
  useBlockUserMutation,
  useUnblockUserMutation,
  useLazySearchUsersQuery,
  useRequestDeleteAccountMutation,
  useConfirmDeleteAccountMutation
} = userApi;
