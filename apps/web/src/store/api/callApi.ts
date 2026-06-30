import { baseApi } from './baseQuery';
import type { CallLog, ApiResponse } from '@zira/types';

export const callApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalls: builder.query<ApiResponse<CallLog[]>, void>({
      query: () => '/calls',
      providesTags: ['Call'],
    }),
    deleteCall: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/calls/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Call'],
    }),
    clearCalls: builder.mutation<ApiResponse<{ success: boolean }>, void>({
      query: () => ({
        url: '/calls',
        method: 'DELETE',
      }),
      invalidatesTags: ['Call'],
    }),
  }),
});

export const { useGetCallsQuery, useDeleteCallMutation, useClearCallsMutation } = callApi;
