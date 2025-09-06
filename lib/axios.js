import axios from 'axios';
import { useAuthStore } from './store';
import { useUIStore } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://65.20.91.194:3000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Only add Authorization header if not /register or /login
    const noAuthEndpoints = ['/register', '/login'];
    const isNoAuth = noAuthEndpoints.some((endpoint) =>
      config.url?.endsWith(endpoint)
    );
    if (!isNoAuth) {
      const token = useAuthStore.getState().getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { addToast } = useUIStore.getState();
    const { clearAuth } = useAuthStore.getState();
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      clearAuth();
      
      // Clear auth cookie
      try {
        await fetch('/api/auth/clear-cookie', { method: 'POST' });
      } catch (e) {
        console.warn('Failed to clear auth cookie:', e);
      }
      
      addToast({
        type: 'warning', // changed from 'error' to 'warning'
        title: 'Session Expired',
        message: 'Please log in again to continue.',
      });
      
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      addToast({
        type: 'error',
        title: 'Server Error',
        message: 'Something went wrong. Please try again later.',
      });
    } else if (error.code === 'ECONNABORTED') {
      addToast({
        type: 'error',
        title: 'Request Timeout',
        message: 'The request took too long. Please check your connection.',
      });
    } else if (!error.response) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper function to handle API errors consistently
export const handleApiError = (error, customMessage = null) => {
  const { addToast } = useUIStore.getState();

  // Get request URL if available
  const url = error.config?.url || '';

  // Only show toast for errors that are not 400/401 on /login or /register
  const isAuthEndpoint = url.endsWith('/login') || url.endsWith('/register');
  const status = error.response?.status;

  if (isAuthEndpoint && (status === 400 || status === 401)) {
    // Let UI handle these errors (e.g., input warning)
    return;
  }

  let message = customMessage || 'An unexpected error occurred.';

  if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }

  addToast({
    type: 'error',
    title: 'Error',
    message,
  });

  console.error('API Error:', error);
};

// Rate limiting helper
export const createRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  const requests = [];
  
  return () => {
    const now = Date.now();
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] <= now - windowMs) {
      requests.shift();
    }
    
    // Check if we've exceeded the limit
    if (requests.length >= maxRequests) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    
    // Add current request
    requests.push(now);
    return true;
  };
};