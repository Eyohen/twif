import axios from 'axios';

const ACCESS_TOKEN_KEY = 'twif_access_token';

const normalizeApiBaseUrl = (value) => {
  const baseUrl = (value || 'http://localhost:8082/api').replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL);

let refreshRequest = null;

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setStoredAccessToken = (token) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const clearStoredAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const currentToken = getStoredAccessToken();

    if (!error.response || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (
      error.response.status !== 401 ||
      !currentToken ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;

      if (!refreshRequest) {
        refreshRequest = axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
      }

      const refreshResponse = await refreshRequest;
      const newAccessToken = refreshResponse.data?.data?.accessToken;
      setStoredAccessToken(newAccessToken);
      refreshRequest = null;

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      refreshRequest = null;
      clearStoredAccessToken();
      return Promise.reject(refreshError);
    }
  }
);

export { API_BASE_URL };
