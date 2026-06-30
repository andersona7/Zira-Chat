import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@zira/types';

export interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  type: 'AUDIO' | 'VIDEO' | null;
  remoteUser: User | null;
  offer: RTCSessionDescriptionInit | null;
}

const initialState: CallState = {
  isActive: false,
  isIncoming: false,
  isOutgoing: false,
  type: null,
  remoteUser: null,
  offer: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    initiateCall: (state, action: PayloadAction<{ remoteUser: User; type: 'AUDIO' | 'VIDEO' }>) => {
      state.isOutgoing = true;
      state.remoteUser = action.payload.remoteUser;
      state.type = action.payload.type;
    },
    receiveCall: (state, action: PayloadAction<{ caller: User; type: 'AUDIO' | 'VIDEO'; offer: RTCSessionDescriptionInit }>) => {
      state.isIncoming = true;
      state.remoteUser = action.payload.caller;
      state.type = action.payload.type;
      state.offer = action.payload.offer;
    },
    acceptCall: (state) => {
      state.isIncoming = false;
      state.isActive = true;
    },
    callConnected: (state) => {
      state.isOutgoing = false;
      state.isActive = true;
    },
    endCall: (state) => {
      return initialState;
    },
  },
});

export const { initiateCall, receiveCall, acceptCall, callConnected, endCall } = callSlice.actions;
export default callSlice.reducer;