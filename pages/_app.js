import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import '../styles/globals.css';
import { initializeAuth } from '../lib/auth';
import { useAuthStore } from '../lib/store';
import socketManager from '../lib/socket';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 12,
  },
  in: {
    opacity: 1,
    x: 0,
  },
  out: {
    opacity: 0,
    x: -12,
  },
};

const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  duration: 0.2,
};

function WireWaveApp({ Component, pageProps, router }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.warn('Auth initialization failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // Handle socket connection based on auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      socketManager.connect();
    } else {
      socketManager.disconnect();
    }

    // Cleanup on unmount
    return () => {
      socketManager.disconnect();
    };
  }, [isAuthenticated, user]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="h-screen bg-chat-bg flex flex-col gap-4 items-center justify-center">
        <div className="flex justify-center items-center gap-2 flex-col text-center space-y-4">
           <Image src="/images/only_hd_logo.png" alt="Wire Wave Logo" width={64} height={64} />
          <h1 className="text-2xl font-brand font-bold text-chat-text">WireWave</h1>
        </div>
        <div className="text-center space-y-4">
          <p className="text-chat-text-muted">Initializing...</p>
          <div className="w-16 h-16 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <div className="h-screen bg-chat-bg text-chat-text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={router.route}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="min-h-screen"
            >
              <Component {...pageProps} />
            </motion.div>
          </AnimatePresence>
          
          <Toaster
            theme="dark"
            position="top-right"
            expand={true}
            richColors={true}
            closeButton={true}
            toastOptions={{
              style: {
                background: '#1F2C34',
                border: '1px solid #202C33',
                color: '#E9EDF0',
              },
            }}
          />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default WireWaveApp;