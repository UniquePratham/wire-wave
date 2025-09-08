// lib/axios.js
import axios from "axios";
import { useAuthStore } from "./store";
import { useUIStore } from "./store";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Create a single Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Helper: detect if running in browser
const isBrowser = () => typeof window !== "undefined";

// Request interceptor: attach token except for auth endpoints
apiClient.interceptors.request.use(
  (config) => {
    try {
      const noAuthEndpoints = ["/register", "/login"];
      const url = config.url || "";
      const skipAuth = noAuthEndpoints.some((p) => url.endsWith(p));

      if (!skipAuth) {
        const token = useAuthStore.getState().getToken?.();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Optional: verbose request debug in dev
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("API request ▶", {
          method: config.method,
          url: config.baseURL + url,
          headers: config.headers,
          data: config.data,
          params: config.params,
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Request interceptor error:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors, handle auth, and log diagnostics
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("API response ◀", {
        url: response.config?.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const { addToast } = useUIStore.getState?.() || { addToast: () => {} };
    const { clearAuth } = useAuthStore.getState?.() || { clearAuth: () => {} };

    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;

    // Rich diagnostics for 4xx/5xx
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("API error ◀", {
        method,
        url: apiClient.defaults.baseURL + (url || ""),
        status,
        responseData: error.response?.data,
        requestData: error.config?.data,
        headers: error.config?.headers,
        message: error.message,
      });
    }

    // 401: session expired or invalid
    if (status === 401) {
      clearAuth();
      try {
        if (isBrowser())
          await fetch("/api/auth/clear-cookie", { method: "POST" });
      } catch {
        // ignore
      }
      addToast?.({
        type: "warning",
        title: "Session expired",
        message: "Please log in again.",
      });
      if (isBrowser() && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    // 5xx: server error - show friendly toast once; details already logged in dev
    if (status >= 500 || !status) {
      addToast?.({
        type: "error",
        title: "Server error",
        message: "The server encountered an error. Please try again shortly.",
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Unified toast + console handler for call-sites
export const handleApiError = (error, customMessage = null) => {
  const { addToast } = useUIStore.getState?.() || { addToast: () => {} };

  const url = error.config?.url || "";
  const isAuthEndpoint = url.endsWith("/login") || url.endsWith("/register");
  const status = error.response?.status;

  // Let UI form validation handle auth 400/401
  if (isAuthEndpoint && (status === 400 || status === 401)) return;

  let message = customMessage || "Unexpected error";
  if (error.response?.data?.message) message = error.response.data.message;
  else if (error.message) message = error.message;

  addToast?.({
    type: "error",
    title: "Error",
    message,
  });

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error("API Error handled:", {
      url: apiClient.defaults.baseURL + url,
      status,
      payload: error.config?.data,
      response: error.response?.data,
    });
  }
};

// Simple in-memory Rate Limiter for client actions
export const createRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  const requests = [];
  return () => {
    const now = Date.now();
    while (requests.length > 0 && requests <= now - windowMs) requests.shift();
    if (requests.length >= maxRequests) {
      throw new Error("Too many requests. Please wait and try again.");
    }
    requests.push(now);
    return true;
  };
};
