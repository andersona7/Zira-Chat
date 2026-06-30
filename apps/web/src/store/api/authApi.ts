import { baseApi } from './baseQuery';
import type { AuthResponse, ApiResponse } from '@zira/types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendOtp: builder.mutation<ApiResponse<any>, { email: string }>({
      query: (data) => ({
        url: '/auth/send-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyOtp: builder.mutation<ApiResponse<any>, { email: string; otp: string }>({
      query: (data) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    register: builder.mutation<ApiResponse<AuthResponse>, any>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    login: builder.mutation<ApiResponse<AuthResponse>, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    sendForgotPasswordOtp: builder.mutation<ApiResponse<any>, { username: string }>({
      query: (data) => ({
        url: '/auth/forgot-password/send-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyForgotPasswordOtp: builder.mutation<ApiResponse<any>, { username: string; otp: string }>({
      query: (data) => ({
        url: '/auth/forgot-password/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<ApiResponse<any>, any>({
      query: (data) => ({
        url: '/auth/forgot-password/reset',
        method: 'POST',
        body: data,
      }),
    }),
    logoutUser: builder.mutation<ApiResponse<void>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    // Enterprise Auth Endpoints
    getCsrfToken: builder.query<ApiResponse<{ csrfToken: string }>, void>({
      query: () => ({
        url: '/auth/csrf-token',
        method: 'GET',
      }),
    }),
    getActiveSessions: builder.query<ApiResponse<any[]>, void>({
      query: () => '/auth/sessions',
      providesTags: ['User'],
    }),
    revokeSession: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/auth/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    revokeAllSessions: builder.mutation<ApiResponse<any>, { keepCurrent: boolean }>({
      query: (data) => ({
        url: '/auth/sessions',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    trustDevice: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/auth/sessions/${id}/trust`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    untrustDevice: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/auth/sessions/${id}/untrust`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    renameDevice: builder.mutation<ApiResponse<any>, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: `/auth/sessions/${id}/rename`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: ['User'],
    }),
    getSecurityLogHistory: builder.query<ApiResponse<{ logs: any[]; total: number; page: number; limit: number }>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => `/auth/security-log?page=${page}&limit=${limit}`,
    }),
    changePassword: builder.mutation<ApiResponse<any>, any>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useRegisterMutation,
  useLoginMutation,
  useSendForgotPasswordOtpMutation,
  useVerifyForgotPasswordOtpMutation,
  useResetPasswordMutation,
  useLogoutUserMutation,
  useGetCsrfTokenQuery,
  useLazyGetCsrfTokenQuery,
  useGetActiveSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
  useTrustDeviceMutation,
  useUntrustDeviceMutation,
  useRenameDeviceMutation,
  useGetSecurityLogHistoryQuery,
  useChangePasswordMutation,
} = authApi;