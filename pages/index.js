import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../lib/store';

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
    <div className="min-h-screen bg-chat-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h1 className="text-3xl font-brand font-bold text-chat-text">ChatPulse</h1>
        <p className="text-chat-text-muted">Redirecting...</p>
      </div>
    </div>
  );
}