import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';

interface RegistrationFormProps {
  onBackToLogin: () => void;
}

export function RegistrationForm({ onBackToLogin }: RegistrationFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      // Clear form
      setUsername('');
      setPassword('');
      setEmail('');
      setSecret('');
      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim() && email.trim() && secret.trim()) {
      registerMutation.mutate({
        username: username.trim(),
        password,
        email: email.trim(),
        secret: secret.trim(),
      });
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 px-4">
      <div className="text-center" style={{ marginBottom: '32px' }}>
        <h2 className="text-gray-200 text-2xl font-semibold">Create your account</h2>
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
              disabled={registerMutation.isPending}
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
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              style={{ padding: '14px 16px' }}
              placeholder="Enter your email"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            <label
              htmlFor="secret"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Secret
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              style={{ padding: '14px 16px' }}
              placeholder="Enter the secret"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          {registerMutation.error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm" style={{ marginTop: '24px' }}>
              {registerMutation.error.message}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-md text-sm" style={{ marginTop: '24px' }}>
              {successMessage} Redirecting to login...
            </div>
          )}

          <div style={{ marginTop: '32px' }}>
            <button
              type="submit"
              disabled={
                registerMutation.isPending ||
                !username.trim() ||
                !password.trim() ||
                !email.trim() ||
                !secret.trim()
              }
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2"
              style={{ padding: '14px 16px' }}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
              {!registerMutation.isPending && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              disabled={registerMutation.isPending}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center gap-2"
              style={{ marginTop: '16px', padding: '14px 16px' }}
            >
              Back to login
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </form>
    </div>
  );
}
