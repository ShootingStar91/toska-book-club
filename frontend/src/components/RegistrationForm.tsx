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
    <div className="max-w-md w-full space-y-8">
      <div className="text-center">
        <p className="text-gray-300 text-lg mb-6">Create your account</p>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Enter your username"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <div>
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Enter your password"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <div>
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Enter your email"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <div>
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Enter the secret"
              disabled={registerMutation.isPending}
              required
            />
          </div>

          {registerMutation.error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
              {registerMutation.error.message}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-md text-sm">
              {successMessage} Redirecting to login...
            </div>
          )}

          <button
            type="submit"
            disabled={
              registerMutation.isPending ||
              !username.trim() ||
              !password.trim() ||
              !email.trim() ||
              !secret.trim()
            }
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            disabled={registerMutation.isPending}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Back to login
          </button>
        </form>
    </div>
  );
}
