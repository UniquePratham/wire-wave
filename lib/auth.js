import apiClient, { handleApiError } from './axios';
import { useAuthStore, useUIStore } from './store';

// Register new user
export const registerUser = async (email, password) => {
  try {
    const response = await apiClient.post('/register', {
      email,
      password,
    });
    
    const { addToast } = useUIStore.getState();
    addToast({
      type: 'success',
      title: 'Registration Successful',
      message: 'Your account has been created. Please log in.',
    });
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'Registration failed. Please try again.');
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/login', {
      email,
      password,
    });
    
    const { token } = response.data;
    const user = { email }; // Backend doesn't return user info, so we create it
    
    // Store in memory
    const { setAuth } = useAuthStore.getState();
    setAuth(token, user);
    
    // Store in secure cookie via API route
    await fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    const { addToast } = useUIStore.getState();
    addToast({
      type: 'success',
      title: 'Login Successful',
      message: `Welcome back, ${email}!`,
    });
    
    return { token, user };
  } catch (error) {
    handleApiError(error, 'Login failed. Please check your email and password.');
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    // Clear memory store
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
    
    // Clear secure cookie
    await fetch('/api/auth/clear-cookie', {
      method: 'POST',
    });
    
    const { addToast } = useUIStore.getState();
    addToast({
      type: 'success',
      title: 'Logged Out',
      message: 'You have been successfully logged out.',
    });
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local state even if cookie clearing fails
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const { isAuthenticated, token } = useAuthStore.getState();
  return isAuthenticated && token;
};

// Get current user
export const getCurrentUser = () => {
  const { user } = useAuthStore.getState();
  return user;
};

// Initialize auth from cookie (for SSR/page refresh)
export const initializeAuth = async () => {
  try {
    const response = await fetch('/api/auth/get-token');
    if (response.ok) {
      const { token, user } = await response.json();
      if (token) {
        // If user is missing, try to decode from token or fallback
        let userObj = user;
        if (!userObj) {
          // Try to decode email from JWT (if possible)
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userObj = { email: payload.email };
          } catch {
            userObj = { email: '' };
          }
        }
        const { setAuth } = useAuthStore.getState();
        setAuth(token, userObj);
        return true;
      }
    }
  } catch (error) {
    console.warn('Failed to initialize auth from cookie:', error);
  }
  return false;
};

// Refresh token (if backend supports it)
export const refreshToken = async () => {
  try {
    const response = await apiClient.post('/refresh-token');
    const { token } = response.data;
    
    const { user, setAuth } = useAuthStore.getState();
    setAuth(token, user);
    
    // Update cookie
    await fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // If refresh fails, logout user
    await logoutUser();
    throw error;
  }
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  // Only require minimum 3 characters to match backend
  const minLength = 3;
  const errors = [];
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};