import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../lib/store';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Redirect based on authentication status
    if (isAuthenticated) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading while redirecting
  return (
     <div className="h-screen bg-chat-bg flex flex-col gap-4 items-center justify-center">
            <div className="flex justify-center items-center gap-2 flex-col text-center space-y-4">
               <Image src="/images/only_hd_logo.png" alt="Wire Wave Logo" width={64} height={64} priority />
              <h1 className="text-2xl font-brand font-bold text-chat-text">WireWave</h1>
            </div>
            <div className="text-center space-y-4">
              <p className="text-chat-text-muted">Redirecting...</p>
              <div className="w-16 h-16 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
    </div>
  );
}