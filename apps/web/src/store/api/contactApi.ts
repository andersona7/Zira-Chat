import { baseApi } from './baseQuery';
import type { Contact, ApiResponse } from '@zira/types';

export const contactApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<ApiResponse<Contact[]>, void>({
      query: () => '/contacts',
      providesTags: ['Contact'],
    }),
    addContact: builder.mutation<ApiResponse<Contact>, { username: string; customName?: string }>({
      query: (data) => ({
        url: '/contacts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Contact'],
    }),
    deleteContact: builder.mutation<ApiResponse<{ id: string; contactUserId: string; chatId?: string }>, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact', 'Chat'],
    }),
    updateContact: builder.mutation<ApiResponse<Contact>, { id: string; customName?: string; isBlocked?: boolean; isFavourite?: boolean; isMuted?: boolean; isLocked?: boolean; lockPin?: string }>({
      query: ({ id, ...body }) => ({
        url: `/contacts/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Contact'],
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          contactApi.util.updateQueryData('getContacts', undefined, (draft) => {
            if (draft.data) {
              const contact = draft.data.find((c: any) => c.id === id);
              if (contact) {
                Object.assign(contact, patch);
              }
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
    sendLockResetOtp: builder.mutation<ApiResponse<{ message: string }>, void>({
      query: () => ({
        url: '/contacts/lock-reset/send-otp',
        method: 'POST',
      }),
    }),
    verifyLockResetOtp: builder.mutation<ApiResponse<{ message: string }>, { otp: string }>({
      query: (body) => ({
        url: '/contacts/lock-reset/verify-otp',
        method: 'POST',
        body,
      }),
    }),
    verifyPasswordForLockReset: builder.mutation<ApiResponse<{ message: string }>, { password: string }>({
      query: (body) => ({
        url: '/contacts/lock-reset/verify-password',
        method: 'POST',
        body,
      }),
    }),
    resetLockPin: builder.mutation<ApiResponse<{ message: string }>, { newPin: string }>({
      query: (body) => ({
        url: '/contacts/lock-reset/reset',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Contact'],
    }),
  }),
});

export const { 
  useGetContactsQuery, 
  useAddContactMutation, 
  useDeleteContactMutation, 
  useUpdateContactMutation,
  useSendLockResetOtpMutation,
  useVerifyLockResetOtpMutation,
  useVerifyPasswordForLockResetMutation,
  useResetLockPinMutation
} = contactApi;