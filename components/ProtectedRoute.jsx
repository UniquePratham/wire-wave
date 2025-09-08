import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../lib/store';
import { initializeAuth } from '../lib/auth';
import Image from 'next/image';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    initializeAuth().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
       <div className="h-screen bg-chat-bg flex flex-col gap-4 items-center justify-center">
                  <div className="flex justify-center items-center gap-2 flex-col text-center space-y-4">
                     <Image src="/images/only_hd_logo.png" alt="Wire Wave Logo" width={64} height={64} />
                    <h1 className="text-2xl font-brand font-bold text-chat-text">WireWave</h1>
                  </div>
                  <div className="text-center space-y-4">
                    <p className="text-chat-text-muted">Loading...</p>
                    <div className="w-16 h-16 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                </div>
    );
  }

  if (!isAuthenticated) return null;

  return children;
}
