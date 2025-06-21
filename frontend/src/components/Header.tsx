import type { User } from '../shared-types';

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-2xl relative">
      <div className="relative w-full px-4 py-4 sm:px-6">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-500 mb-2 pb-2 relative">
            <span className="relative z-10">
              Toska Book Club
            </span>
            {/* Multiple glow layers for enhanced effect */}
            <div className="absolute inset-0 text-orange-500 blur-lg opacity-30">Toska Book Club</div>
            <div className="absolute inset-0 text-orange-500 blur-md opacity-20">Toska Book Club</div>
            <div className="absolute inset-0 text-orange-500 blur-sm opacity-40">Toska Book Club</div>
            {/* Radial glow emanating from text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-20 bg-orange-500/10 blur-2xl rounded-full"></div>
          </h1>
          {user && (
            <div className="flex items-center gap-4 backdrop-blur-sm bg-gray-900/30 px-4 py-2 rounded-full border border-gray-700/50">
              <span className="text-gray-300 text-sm sm:text-base">
                Logged in as <span className="text-white font-medium">{user.username}</span>
                {user.isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded-full shadow-lg">
                    Admin
                  </span>
                )}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-gray-600/80 hover:bg-gray-700 text-white px-3 py-1 rounded-full text-sm transition-all duration-200 border-none outline-none hover:shadow-lg backdrop-blur-sm flex items-center gap-2"
                >
                  Logout
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
