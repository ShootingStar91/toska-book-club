import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api';
import { getValidToken, getUserFromToken, removeAuthToken } from './auth';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { PhaseView } from './components/PhaseView';

import './App.css';
import type { User } from './shared-types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    // Check for existing valid token on app load
    const token = getValidToken();
    if (token) {
      const userData = getUserFromToken(token);
      if (userData) {
        setUser(userData);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    queryClient.clear(); // Clear all cached queries
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header user={user} onLogout={user ? handleLogout : undefined} />
        <div className="flex-1 flex items-start justify-center pt-4 px-0 py-4 sm:px-4">
          {user ? (
            <PhaseView user={user} />
          ) : showRegistration ? (
            <RegistrationForm onBackToLogin={handleBackToLogin} />
          ) : (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onShowRegistration={handleShowRegistration}
            />
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
