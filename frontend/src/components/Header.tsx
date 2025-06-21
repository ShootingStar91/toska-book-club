import type { User } from '../shared-types';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="w-full px-4 py-4 sm:px-6">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-500 mb-2 pb-2">
            Toska Book Club
          </h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm sm:text-base">
                Logged in as {user.username}
                {user.isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded">
                    Admin
                  </span>
                )}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded-md text-sm transition-colors border-none outline-none"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
