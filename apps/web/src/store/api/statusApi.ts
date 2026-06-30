import { baseApi } from './baseQuery';
import type { UserStatusGroup, ApiResponse } from '@zira/types';

export const statusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStatuses: builder.query<ApiResponse<UserStatusGroup[]>, void>({
      query: () => '/statuses',
      providesTags: ['Status'],
    }),
    createStatus: builder.mutation<ApiResponse<any>, any>({
      query: (data) => ({
        url: '/statuses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Status'],
    }),
    markStatusViewed: builder.mutation<ApiResponse<void>, string>({
      query: (statusId) => ({
        url: `/statuses/${statusId}/view`,
        method: 'POST',
      }),
      // Using optimistic updates instead of full invalidation to prevent jitter
      onQueryStarted: async (statusId, { dispatch, queryFulfilled, getState }) => {
        const state = getState() as any;
        const userId = state.auth.user?.id;
        
        const patchResult = dispatch(
          statusApi.util.updateQueryData('getStatuses', undefined, (draft) => {
            if (draft.data) {
               draft.data.forEach(group => {
                 group.statuses.forEach(status => {
                   if (status.id === statusId && !status.viewers.includes(userId)) {
                     status.viewers.push(userId);
                   }
                 });
                 // Re-evaluate group viewed status
                 group.isAllViewed = group.statuses.every(s => s.viewers.includes(userId));
               });
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
  }),
});

export const { useGetStatusesQuery, useCreateStatusMutation, useMarkStatusViewedMutation } = statusApi;