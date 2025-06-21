import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { votingCyclesApi, queryKeys } from '../api';
import type { CreateVotingCycleRequest } from '../shared-types';

interface AdminControlsProps {
  onCycleCreated: () => void;
}

export function AdminControls({ onCycleCreated }: AdminControlsProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateVotingCycleRequest>({
    suggestionDeadline: '',
    votingDeadline: '',
  });

  const createCycleMutation = useMutation({
    mutationFn: votingCyclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.votingCycles.all });
      setShowForm(false);
      setFormData({ suggestionDeadline: '', votingDeadline: '' });
      onCycleCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.suggestionDeadline && formData.votingDeadline) {
      createCycleMutation.mutate(formData);
    }
  };

  // Helper to get minimum datetime (now + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
      <div className="max-w-4xl mx-auto">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Start New Voting Cycle
          </button>
        ) : (
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Create New Voting Cycle
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Suggestion Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.suggestionDeadline}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        suggestionDeadline: e.target.value,
                      })
                    }
                    min={getMinDateTime()}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    required
                    disabled={createCycleMutation.isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Voting Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.votingDeadline}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        votingDeadline: e.target.value,
                      })
                    }
                    min={formData.suggestionDeadline || getMinDateTime()}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    required
                    disabled={createCycleMutation.isPending}
                  />
                </div>
              </div>

              {createCycleMutation.error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                  {createCycleMutation.error.message}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={
                    createCycleMutation.isPending ||
                    !formData.suggestionDeadline ||
                    !formData.votingDeadline
                  }
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
                >
                  {createCycleMutation.isPending
                    ? 'Creating...'
                    : 'Create Cycle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                  disabled={createCycleMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
