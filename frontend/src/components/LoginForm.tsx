import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import { saveAuthToken } from '../auth';
import type { User } from '../shared-types';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onShowRegistration: () => void;
}

export function LoginForm({ onLoginSuccess, onShowRegistration }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      saveAuthToken(response.token);
      onLoginSuccess(response.user);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      loginMutation.mutate({ username: username.trim(), password });
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 px-4">
      <div className="text-center" style={{ marginBottom: '32px' }}>
        <h2 className="text-gray-200 text-2xl font-semibold">Sign in to your account</h2>
      </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              style={{ padding: '14px 16px' }}
              placeholder="Enter your username"
              disabled={loginMutation.isPending}
              required
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              style={{ padding: '14px 16px' }}
              placeholder="Enter your password"
              disabled={loginMutation.isPending}
              required
            />
          </div>

          {loginMutation.error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm" style={{ marginTop: '24px' }}>
              {loginMutation.error.message}
            </div>
          )}

          <div style={{ marginTop: '32px' }}>
            <button
              type="submit"
              disabled={
                loginMutation.isPending || !username.trim() || !password.trim()
              }
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2"
              style={{ padding: '14px 16px' }}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              {!loginMutation.isPending && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={onShowRegistration}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2"
              style={{ marginTop: '16px', padding: '14px 16px' }}
            >
              Create new account
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
            </button>
          </div>
        </form>
    </div>
  );
}
