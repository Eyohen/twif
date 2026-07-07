import { createContext, useContext, useEffect, useState } from 'react';
import {
  api,
  API_BASE_URL,
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../lib/api';

const AuthContext = createContext(null);

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.message ||
  (error.request ? `Cannot reach the API server at ${API_BASE_URL}. Make sure the backend is running and the URL is correct.` : null) ||
  error.message ||
  fallback;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  const applyAuthPayload = (payload) => {
    setUser(payload?.user || null);
    setProfile(payload?.profile || null);
  };

  const clearAuthState = () => {
    clearStoredAccessToken();
    setUser(null);
    setProfile(null);
  };

  const loadCurrentUser = async () => {
    const response = await api.get('/auth/me');
    applyAuthPayload(response.data.data);
    return response.data.data;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredAccessToken();

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        await loadCurrentUser();
      } catch (error) {
        clearAuthState();
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const payload = response.data.data;
      setStoredAccessToken(payload.accessToken);
      applyAuthPayload(payload);
      return payload;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to sign in'));
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.post('/auth/register', payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create account'));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Clear local auth state even if the server logout request fails.
    } finally {
      clearAuthState();
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await api.get('/profile/me');
      setProfile(response.data.data.profile);
      return response.data.data.profile;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load profile'));
    }
  };

  const updateProfile = async (updates) => {
    if (!user?.accountType) {
      throw new Error('No signed-in account found');
    }

    const response = await api.patch(`/profile/${user.accountType}`, updates);
    setProfile(response.data.data);
    setUser((currentUser) => (
      currentUser
        ? {
            ...currentUser,
            onboardingCompleted: response.data.data.onboardingCompleted ?? currentUser.onboardingCompleted,
            onboardingStep: response.data.data.onboardingStep ?? currentUser.onboardingStep,
          }
        : currentUser
    ));
    return response.data.data;
  };

  const changePassword = async (payload) => {
    try {
      const response = await api.put('/auth/change-password', payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to change password'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
