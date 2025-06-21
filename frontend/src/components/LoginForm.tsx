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
    <div className="max-w-md w-full space-y-8" style={{ margin: '0 2px' }}>
      <div className="text-center">
        <p className="text-gray-300 text-lg mb-6">Sign in to your account</p>
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
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              style={{ padding: '14px 16px' }}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={onShowRegistration}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              style={{ marginTop: '16px', padding: '14px 16px' }}
            >
              Create new account
            </button>
          </div>
        </form>
    </div>
  );
}
