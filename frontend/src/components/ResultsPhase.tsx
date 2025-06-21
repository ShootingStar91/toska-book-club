import type { VotingCycle } from '../shared-types';

interface ResultsPhaseProps {
  cycle: VotingCycle;
}

export function ResultsPhase({ cycle }: ResultsPhaseProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">Results</h2>
        <p className="text-gray-300 mb-4">
          Voting has ended. Here are the results!
        </p>
        <div className="text-sm text-gray-400">
          <p>Cycle ended: {new Date(cycle.votingDeadline).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Results display coming soon...</p>
      </div>
    </div>
  );
}
