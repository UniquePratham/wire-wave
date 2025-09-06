import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, LogOut, Settings } from 'lucide-react';

import ProtectedRoute from '../components/ProtectedRoute';
import { logoutUser } from '../lib/auth';
import { useAuthStore } from '../lib/store';
import { Button } from '../src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';
import { Avatar, AvatarFallback } from '../src/components/ui/avatar';
import { getDisplayName, generateAvatar, getAvatarColor } from '../lib/contacts';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user.email);
  const avatar = generateAvatar(user.email);
  const avatarColor = getAvatarColor(user.email);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-chat-bg p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-brand font-bold text-chat-text mb-2">Profile</h1>
            <p className="text-chat-text-muted">Manage your ChatPulse account</p>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-chat-panel border-chat-surface-alt">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${avatarColor}`}>
                    {avatar}
                  </div>
                </div>
                <CardTitle className="text-chat-text">{displayName}</CardTitle>
                <CardDescription className="text-chat-text-muted">{user.email}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Account Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-chat-surface rounded-lg">
                    <Mail className="w-5 h-5 text-chat-text-muted" />
                    <div>
                      <p className="text-sm font-medium text-chat-text">Email</p>
                      <p className="text-sm text-chat-text-muted">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-chat-surface rounded-lg">
                    <User className="w-5 h-5 text-chat-text-muted" />
                    <div>
                      <p className="text-sm font-medium text-chat-text">Display Name</p>
                      <p className="text-sm text-chat-text-muted">{displayName}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-chat-surface-alt">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-chat-surface border-chat-surface-alt text-chat-text hover:bg-chat-surface-alt"
                    disabled
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                    <span className="ml-auto text-xs text-chat-text-muted">Coming Soon</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start bg-chat-surface border-chat-surface-alt text-chat-text hover:bg-chat-surface-alt"
                    disabled
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                    <span className="ml-auto text-xs text-chat-text-muted">Coming Soon</span>
                  </Button>

                  <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full justify-start bg-chat-error hover:bg-red-600 text-white"
                  >
                    {isLoggingOut ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Back to Chat */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="bg-chat-surface border-chat-surface-alt text-chat-text hover:bg-chat-surface-alt"
            >
              Back to Chat
            </Button>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}