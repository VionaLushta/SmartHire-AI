import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from '../../services/api';
import { getAuthErrorMessage, normalizeAuthResponse } from '../../utils/auth';

const persistedAuth = readStoredAuth();

const initialState = {
  user: persistedAuth?.user ?? null,
  token: persistedAuth?.token ?? null,
  refreshToken: persistedAuth?.refreshToken ?? null,
  rememberMe: persistedAuth?.rememberMe ?? true,
  status: 'idle',
  error: null,
  bootstrapped: false,
  verificationRequired: false,
};

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.me();
      const normalized = normalizeAuthResponse(response);
      return {
        ...normalized,
        token: normalized.token ?? persistedAuth?.token ?? null,
        rememberMe: persistedAuth?.rememberMe ?? true,
      };
    } catch (error) {
      clearStoredAuth();
      return rejectWithValue(getAuthErrorMessage(error, 'Unable to restore your session.'));
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return {
        ...normalizeAuthResponse(response),
        rememberMe: Boolean(credentials.rememberMe ?? credentials.remember_me),
      };
    } catch (error) {
      return rejectWithValue(getAuthErrorMessage(error, 'Invalid email or password.'));
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await authService.register(payload);
      return { ...normalizeAuthResponse(response), rememberMe: false };
    } catch (error) {
      return rejectWithValue(getAuthErrorMessage(error, 'Registration failed.'));
    }
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      await authService.logout({ remember_me: auth.rememberMe });
      return true;
    } catch (error) {
      return rejectWithValue(getAuthErrorMessage(error, 'Unable to log out.'));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.rememberMe = true;
      state.status = 'idle';
      state.error = null;
      state.verificationRequired = false;
      clearStoredAuth();
    },
    hydrateAuth(state, action) {
      state.user = action.payload?.user ?? null;
      state.token = action.payload?.token ?? null;
      state.refreshToken = action.payload?.refreshToken ?? null;
      state.rememberMe = action.payload?.rememberMe ?? true;
      state.bootstrapped = true;
      state.status = 'succeeded';
      state.error = null;
      writeStoredAuth(
        { user: state.user, token: state.token, refreshToken: state.refreshToken },
        state.rememberMe,
      );
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.status = 'loading';
      state.error = null;
    };

    const handleRejected = (state, action) => {
      state.status = 'failed';
      state.error = action.payload || action.error.message || 'Something went wrong.';
      state.bootstrapped = true;
      clearStoredAuth();
    };

    const handleFulfilled = (state, action) => {
      state.status = 'succeeded';
      state.user = action.payload?.requires_verification ? null : action.payload?.user ?? null;
      state.token = action.payload?.requires_verification ? null : action.payload?.token ?? null;
      state.refreshToken = action.payload?.requires_verification ? null : action.payload?.refreshToken ?? null;
      state.rememberMe = action.payload?.rememberMe ?? state.rememberMe;
      state.verificationRequired = Boolean(action.payload?.requires_verification);
      state.error = null;
      state.bootstrapped = true;
      if (state.verificationRequired) {
        clearStoredAuth();
      } else {
        writeStoredAuth(
          { user: state.user, token: state.token, refreshToken: state.refreshToken },
          state.rememberMe,
        );
      }
    };

    builder
      .addCase(bootstrapAuth.pending, handlePending)
      .addCase(bootstrapAuth.fulfilled, handleFulfilled)
      .addCase(bootstrapAuth.rejected, (state) => {
        state.status = 'idle';
        state.error = null;
        state.bootstrapped = true;
      })
      .addCase(loginUser.pending, handlePending)
      .addCase(loginUser.fulfilled, handleFulfilled)
      .addCase(loginUser.rejected, handleRejected)
      .addCase(registerUser.pending, handlePending)
      .addCase(registerUser.fulfilled, handleFulfilled)
      .addCase(registerUser.rejected, handleRejected)
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.rememberMe = true;
        state.status = 'idle';
        state.error = null;
        state.verificationRequired = false;
        clearStoredAuth();
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Unable to log out.';
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.rememberMe = true;
        state.verificationRequired = false;
        clearStoredAuth();
      });
  },
});

export const { clearAuthError, logout, hydrateAuth } = authSlice.actions;

export default authSlice.reducer;
