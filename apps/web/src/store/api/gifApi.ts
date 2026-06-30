import { baseApi } from './baseQuery';
import type { ApiResponse } from '@zira/types';

export const gifApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFavorites: builder.query<ApiResponse<string[]>, void>({
      query: () => '/gifs/favorites',
      providesTags: ['GifFavorite'],
    }),
    addFavorite: builder.mutation<ApiResponse<void>, string>({
      query: (gifId) => ({
        url: `/gifs/favorites/${gifId}`,
        method: 'POST',
      }),
      invalidatesTags: ['GifFavorite'],
    }),
    removeFavorite: builder.mutation<ApiResponse<void>, string>({
      query: (gifId) => ({
        url: `/gifs/favorites/${gifId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['GifFavorite'],
    }),
    getRecent: builder.query<ApiResponse<string[]>, void>({
      query: () => '/gifs/recent',
      providesTags: ['GifRecent'],
    }),
    recordUsage: builder.mutation<ApiResponse<void>, string>({
      query: (gifId) => ({
        url: `/gifs/recent/${gifId}`,
        method: 'POST',
      }),
      invalidatesTags: ['GifRecent'],
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetRecentQuery,
  useRecordUsageMutation,
} = gifApi;
