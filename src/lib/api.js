import axios from 'axios';

const ACCESS_TOKEN_KEY = 'twif_access_token';
const PRODUCTION_API_BASE_URL = 'https://twif-app-backend-production.up.railway.app/api';
const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? PRODUCTION_API_BASE_URL
  : 'http://localhost:8082/api';

const normalizeApiBaseUrl = (value) => {
  // Hosting dashboards expect the value without quotes, but accepting a quoted
  // value avoids producing an invalid URL if it was pasted from an .env file.
  let baseUrl = String(value || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2')
    .replace(/\/+$/, '');

  // A localhost API can only be reached by the machine serving the browser.
  // Never let a stale hosting variable bake it into a production bundle.
  if (import.meta.env.PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(baseUrl)) {
    baseUrl = PRODUCTION_API_BASE_URL;
  }

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
