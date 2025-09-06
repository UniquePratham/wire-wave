import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { loginUser } from '../lib/auth';
import { useAuthStore, useUIStore } from '../lib/store';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';

// If you import ProtectedRoute here, update as follows:
// import ProtectedRoute from '../components/ProtectedRoute.jsx';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const result = await loginUser(data.email, data.password);
      if (result && result.token) {
        router.push('/chat');
      } else {
        setLoginError('Invalid email or password.');
      }
    } catch (error) {
      // Only show error if not already handled by axios.js
      if (error?.response?.status !== 401) {
        let msg = 'Invalid email or password.';
        if (error?.response?.data?.message) {
          msg = error.response.data.message;
        }
        setLoginError(msg);
      }
      console.error('Login error:', error);
    } finally {
        setTimeout(() => {
          console.log("after 5 seconds");
          setLoginError('');
        }, 5000); // Clear error after 5 seconds
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-chat-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-chat-text-muted">Redirecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-chat-panel border-chat-surface-alt p-4">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16  rounded-full flex items-center justify-center "
            >
              <Image src="/images/only_hd_logo.png" alt="Wire Wave Logo" width={64} height={64} />
            </motion.div>
            
            <div>
              <CardTitle className="text-2xl font-brand font-bold text-chat-text flex items-center justify-center gap-5">
                <Send className="w-6 h-6 text-chat-text-muted" />
                Welcome to Wire Wave
              </CardTitle>
              <CardDescription className="text-chat-text-muted mt-2">
                Sign in to start messaging
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-chat-text">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-chat-text-muted w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-chat-error text-sm">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-chat-text">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-chat-text-muted w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-chat-text-muted hover:text-chat-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-chat-error text-sm">{errors.password.message}</p>
                )}
                {loginError && (
                  <p className="text-chat-error text-sm">{loginError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-700 hover:bg-chat-accent text-white font-medium py-2 px-4 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-chat-text-muted text-sm">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="text-chat-accent hover:text-green-400 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-chat-text-muted text-xs"
        >
          <p>Secure • Real-time • Beautiful</p>
        </motion.div>
      </motion.div>
    </div>
  );
}