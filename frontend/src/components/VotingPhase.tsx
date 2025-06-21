import type { User, VotingCycle } from '../shared-types';

interface VotingPhaseProps {
  cycle: VotingCycle;
  user: User;
}

export function VotingPhase({ cycle }: VotingPhaseProps) {
  const votingDeadline = new Date(cycle.votingDeadline);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">
          Voting Phase
        </h2>
        <p className="text-gray-300 mb-4">
          Vote for your favorite book suggestions.
        </p>
        <div className="text-sm text-gray-400">
          <p>Voting deadline: {votingDeadline.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Voting interface coming soon...</p>
      </div>
    </div>
  );
}
