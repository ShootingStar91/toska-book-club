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
    votingMode: 'normal',
  });

  // Initialize form data when editing
  const initializeEditForm = () => {
    if (currentCycle) {
      // Convert ISO strings to date format (YYYY-MM-DD)
      const suggestionDate = new Date(currentCycle.suggestionDeadline);
      const votingDate = new Date(currentCycle.votingDeadline);
      
      setFormData({
        suggestionDeadline: suggestionDate.toISOString().slice(0, 10),
        votingDeadline: votingDate.toISOString().slice(0, 10),
        votingMode: currentCycle.votingMode,
      });
    }
  };

  const createCycleMutation = useMutation({
    mutationFn: votingCyclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.votingCycles.all });
      setShowForm(false);
      setFormData({ suggestionDeadline: '', votingDeadline: '', votingMode: 'normal' });
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

    // Convert date to end of day (23:59:59.999) and then to ISO strings
    const suggestionDate = new Date(formData.suggestionDeadline);
    suggestionDate.setHours(23, 59, 59, 999);
    const suggestionISOString = suggestionDate.toISOString();
    
    const votingDate = new Date(formData.votingDeadline);
    votingDate.setHours(23, 59, 59, 999);
    const votingISOString = votingDate.toISOString();

    if (isEditing && currentCycle) {
      updateCycleMutation.mutate({
        cycleId: currentCycle.id,
        data: {
          suggestionDeadline: suggestionISOString,
          votingDeadline: votingISOString,
          votingMode: formData.votingMode,
        },
      });
    } else {
      createCycleMutation.mutate({
        suggestionDeadline: suggestionISOString,
        votingDeadline: votingISOString,
        votingMode: formData.votingMode || 'normal',
      });
    }
  };

  const handleShowForm = () => {
    if (isEditing) {
      initializeEditForm();
    } else {
      setFormData({ suggestionDeadline: '', votingDeadline: '', votingMode: 'normal' });
    }
    setShowForm(true);
  };

  // Helper to get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  // Get the current mutation for loading state and errors
  const currentMutation = isEditing ? updateCycleMutation : createCycleMutation;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
      <div className="max-w-4xl mx-auto">
        {!showForm ? (
          <div className="flex justify-center">
            <button
              onClick={handleShowForm}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center gap-2"
            >
            {isEditing ? 'Edit Current Cycle' : 'Start New Voting Cycle'}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            </button>
          </div>
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
                    type="date"
                    value={formData.suggestionDeadline}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        suggestionDeadline: e.target.value,
                      })
                    }
                    min={isEditing ? undefined : getMinDate()}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    lang="fi"
                    required
                    disabled={currentMutation.isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Voting Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.votingDeadline}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        votingDeadline: e.target.value,
                      })
                    }
                    min={isEditing ? undefined : (formData.suggestionDeadline || getMinDate())}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-orange-500"
                    lang="fi"
                    required
                    disabled={currentMutation.isPending}
                  />
                </div>
              </div>

              {/* Voting Mode Selection - only show when creating new cycle */}
              {!isEditing && (
                <div className="flex justify-center">
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="votingMode"
                        value="normal"
                        checked={formData.votingMode === 'normal'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            votingMode: e.target.value as 'normal' | 'ranking',
                          })
                        }
                        className="w-4 h-4 text-orange-600 bg-gray-600 border-gray-500 focus:ring-orange-500 focus:ring-2"
                        disabled={currentMutation.isPending}
                      />
                      <span className="ml-3 text-gray-300">
                        <span className="font-medium text-base">Normal Voting</span>
                        <span className="block text-gray-400 text-sm mt-1">Users can vote for any number of books they like</span>
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="votingMode"
                        value="ranking"
                        checked={formData.votingMode === 'ranking'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            votingMode: e.target.value as 'normal' | 'ranking',
                          })
                        }
                        className="w-4 h-4 text-orange-600 bg-gray-600 border-gray-500 focus:ring-orange-500 focus:ring-2"
                        disabled={currentMutation.isPending}
                      />
                      <span className="ml-3 text-gray-300">
                        <span className="font-medium text-base">Ranking Voting</span>
                        <span className="block text-gray-400 text-sm mt-1">Users rank all books from best to worst by dragging</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {currentMutation.error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                  {currentMutation.error.message}
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <button
                  type="submit"
                  disabled={
                    currentMutation.isPending ||
                    !formData.suggestionDeadline ||
                    !formData.votingDeadline
                  }
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                >
                  {currentMutation.isPending
                    ? (isEditing ? 'Updating...' : 'Creating...')
                    : (isEditing ? 'Update Cycle' : 'Create Cycle')}
                  {!currentMutation.isPending && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                  disabled={currentMutation.isPending}
                >
                  Cancel
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
