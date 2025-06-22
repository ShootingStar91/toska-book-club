import { useQuery } from '@tanstack/react-query';
import { votingCyclesApi, queryKeys } from '../api';
import { SuggestingPhase } from './SuggestingPhase';
import { VotingPhase } from './VotingPhase';
import { ResultsPhase } from './ResultsPhase';
import { AdminControls } from './AdminControls';
import type { User } from '../shared-types';

interface PhaseViewProps {
  user: User;
}

export function PhaseView({ user }: PhaseViewProps) {
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
    <div className="w-full max-w-4xl">
      {/* Main Content */}
      <main className={`px-4 py-6 sm:px-6 ${user.isAdmin ? 'pb-32' : ''}`}>
        {(error as { status?: number })?.status === 404 || !currentCycle ? (
          // No active cycle
          <div className="py-12">
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
          <div className="py-12">
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

        {/* Admin Controls */}
        {user.isAdmin && <AdminControls currentCycle={currentCycle} onCycleCreated={handleCycleCreated} />}
      </main>
    </div>
  );
}
