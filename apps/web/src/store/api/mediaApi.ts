import { baseApi } from './baseQuery';
import type { MediaMetadata, ApiResponse } from '@zira/types';

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadMedia: builder.mutation<ApiResponse<MediaMetadata>, FormData>({
      query: (formData) => ({
        url: '/media/upload',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const { useUploadMediaMutation } = mediaApi;