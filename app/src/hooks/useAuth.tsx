import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login, register, refreshToken, getMe, logout as logoutApi, type LoginRequest, type RegisterRequest, type User } from '@/services/authApi';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTokens = useCallback(async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (accessToken && refreshTokenValue) {
        try {
          const userData = await getMe(accessToken);
          setUser(userData);
        } catch (error) {
          // Access token expired, try to refresh
          try {
            const newTokens = await refreshToken(refreshTokenValue);
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newTokens.access_token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newTokens.refresh_token);
            const userData = await getMe(newTokens.access_token);
            setUser(userData);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load tokens', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    const tokens = await login(credentials);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    const userData = await getMe(tokens.access_token);
    setUser(userData);
  }, []);

  const handleRegister = useCallback(async (credentials: RegisterRequest) => {
    const tokens = await register(credentials);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    const userData = await getMe(tokens.access_token);
    setUser(userData);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshTokenValue) {
        await logoutApi(refreshTokenValue);
      }
    } catch (error) {
      console.warn('Logout API call failed', error);
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    const tokens = await refreshToken(refreshTokenValue);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    const userData = await getMe(tokens.access_token);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshAuth: handleRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

