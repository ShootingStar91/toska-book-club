import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { votingCyclesApi, queryKeys } from '../api';
import type { CreateVotingCycleRequest, UpdateVotingCycleRequest, VotingCycle } from '../shared-types';

interface AdminControlsProps {
  currentCycle: VotingCycle | null | undefined;
  onCycleCreated: () => void;
}

export function AdminControls({ currentCycle, onCycleCreated }: AdminControlsProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  
  // Determine if we're editing or creating
  const isEditing = currentCycle && currentCycle.status !== 'completed';
  
  // Form data for both create and edit
  const [formData, setFormData] = useState<CreateVotingCycleRequest | UpdateVotingCycleRequest>({
    suggestionDeadline: '',
    votingDeadline: '',
  });

  // Initialize form data when editing
  const initializeEditForm = () => {
    if (currentCycle) {
      // Convert ISO strings to datetime-local format
      const suggestionDate = new Date(currentCycle.suggestionDeadline);
      const votingDate = new Date(currentCycle.votingDeadline);
      
      setFormData({
        suggestionDeadline: suggestionDate.toISOString().slice(0, 16),
        votingDeadline: votingDate.toISOString().slice(0, 16),
      });
    }
  };

  const createCycleMutation = useMutation({
    mutationFn: votingCyclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.votingCycles.all });
      setShowForm(false);
      setFormData({ suggestionDeadline: '', votingDeadline: '' });
      onCycleCreated();
    },
  });

  const updateCycleMutation = useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: UpdateVotingCycleRequest }) =>
      votingCyclesApi.update(cycleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.votingCycles.all });
      setShowForm(false);
      onCycleCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.suggestionDeadline || !formData.votingDeadline) {
      return;
    }

    // Convert datetime-local back to ISO strings
    const suggestionISOString = new Date(formData.suggestionDeadline).toISOString();
    const votingISOString = new Date(formData.votingDeadline).toISOString();

    if (isEditing && currentCycle) {
      updateCycleMutation.mutate({
        cycleId: currentCycle.id,
        data: {
          suggestionDeadline: suggestionISOString,
          votingDeadline: votingISOString,
        },
      });
    } else {
      createCycleMutation.mutate({
        suggestionDeadline: suggestionISOString,
        votingDeadline: votingISOString,
      });
    }
  };

  const handleShowForm = () => {
    if (isEditing) {
      initializeEditForm();
    } else {
      setFormData({ suggestionDeadline: '', votingDeadline: '' });
    }
    setShowForm(true);
  };

  // Helper to get minimum datetime (now + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  // Get the current mutation for loading state and errors
  const currentMutation = isEditing ? updateCycleMutation : createCycleMutation;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
      <div className="max-w-4xl mx-auto">
        {!showForm ? (
          <button
            onClick={handleShowForm}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            {isEditing ? 'Edit Current Cycle' : 'Start New Voting Cycle'}
          </button>
        ) : (
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {isEditing ? 'Edit Voting Cycle Deadlines' : 'Create New Voting Cycle'}
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
                    min={isEditing ? undefined : getMinDateTime()}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    required
                    disabled={currentMutation.isPending}
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
                    min={isEditing ? undefined : (formData.suggestionDeadline || getMinDateTime())}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    required
                    disabled={currentMutation.isPending}
                  />
                </div>
              </div>

              {currentMutation.error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                  {currentMutation.error.message}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={
                    currentMutation.isPending ||
                    !formData.suggestionDeadline ||
                    !formData.votingDeadline
                  }
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
                >
                  {currentMutation.isPending
                    ? (isEditing ? 'Updating...' : 'Creating...')
                    : (isEditing ? 'Update Cycle' : 'Create Cycle')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                  disabled={currentMutation.isPending}
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
