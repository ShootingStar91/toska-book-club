import { useQuery } from '@tanstack/react-query';
import { votingCyclesApi, queryKeys } from '../api';
import { SuggestingPhase } from './SuggestingPhase';
import { VotingPhase } from './VotingPhase';
import { ResultsPhase } from './ResultsPhase';
import { AdminControls } from './AdminControls';
import type { User } from '../shared-types';

interface PhaseViewProps {
  user: User;
  onLogout: () => void;
}

export function PhaseView({ user, onLogout }: PhaseViewProps) {
  const {
    data: currentCycle,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.votingCycles.current,
    queryFn: votingCyclesApi.getCurrent,
    retry: (failureCount, error) => {
      // Don't retry if there's no active cycle (404)
      if ((error as { status?: number })?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const handleCycleCreated = () => {
    refetch(); // Refresh current cycle data
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-500">
              Toska Book Club
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm sm:text-base">
                Welcome, {user.username}
                {user.isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={onLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {(error as { status?: number })?.status === 404 || !currentCycle ? (
          // No active cycle
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-4">
              No active voting cycle
            </div>
            <p className="text-gray-500 mb-8">
              {user.isAdmin
                ? 'Create a new voting cycle to get started.'
                : 'Wait for an admin to start a new voting cycle.'}
            </p>
          </div>
        ) : error ? (
          // Other errors
          <div className="text-center py-12">
            <div className="text-red-400 text-xl mb-4">
              Error loading voting cycle
            </div>
            <p className="text-gray-500 mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          // Active cycle - render appropriate phase
          <div>
            {currentCycle.status === 'suggesting' && (
              <SuggestingPhase cycle={currentCycle} user={user} />
            )}
            {currentCycle.status === 'voting' && (
              <VotingPhase cycle={currentCycle} user={user} />
            )}
            {currentCycle.status === 'completed' && (
              <ResultsPhase cycle={currentCycle} />
            )}
          </div>
        )}
      </main>

      {/* Admin Controls */}
      {user.isAdmin && <AdminControls onCycleCreated={handleCycleCreated} />}
    </div>
  );
}
