import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookSuggestionsApi, queryKeys } from '../api';
import type {
  CreateBookSuggestionRequest,
  UpdateBookSuggestionRequest,
  User,
  VotingCycle,
} from '../shared-types';

interface SuggestingPhaseProps {
  cycle: VotingCycle;
  user: User;
}

// Helper function to format URL for display
const formatUrlForDisplay = (url: string): string => {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  return cleanUrl.length > 20 ? cleanUrl.substring(0, 20) + '...' : cleanUrl;
};

export function SuggestingPhase({ cycle }: SuggestingPhaseProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreateBookSuggestionRequest>({
    title: '',
    author: '',
    year: undefined,
    pageCount: undefined,
    link: '',
    miscInfo: '',
  });

  // Get user's current suggestion
  const { data: userSuggestion } = useQuery({
    queryKey: queryKeys.bookSuggestions.userSuggestion(cycle.id),
    queryFn: () => bookSuggestionsApi.getUserSuggestion(cycle.id),
    retry: (failureCount, error) => {
      if ((error as { status?: number })?.status === 404) return false; // No suggestion yet
      return failureCount < 3;
    },
  });

  // Get all suggestions for the cycle
  const { data: allSuggestions = [] } = useQuery({
    queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
    queryFn: () => bookSuggestionsApi.getForCycle(cycle.id),
  });

  const createSuggestionMutation = useMutation({
    mutationFn: bookSuggestionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookSuggestions.userSuggestion(cycle.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
      });
      resetForm();
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: ({ suggestionId, data }: { suggestionId: string; data: UpdateBookSuggestionRequest }) =>
      bookSuggestionsApi.update(suggestionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookSuggestions.userSuggestion(cycle.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
      });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setFormData({
      title: '',
      author: '',
      year: undefined,
      pageCount: undefined,
      link: '',
      miscInfo: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.author.trim()) {
      const submitData = {
        ...formData,
        title: formData.title.trim(),
        author: formData.author.trim(),
        link: formData.link?.trim() || undefined,
        miscInfo: formData.miscInfo?.trim() || undefined,
      };
      
      if (isEditing && userSuggestion) {
        updateSuggestionMutation.mutate({
          suggestionId: userSuggestion.id,
          data: submitData,
        });
      } else {
        createSuggestionMutation.mutate(submitData);
      }
    }
  };

  const handleEdit = () => {
    if (userSuggestion) {
      setFormData({
        title: userSuggestion.title,
        author: userSuggestion.author,
        year: userSuggestion.year || undefined,
        pageCount: userSuggestion.pageCount || undefined,
        link: userSuggestion.link || '',
        miscInfo: userSuggestion.miscInfo || '',
      });
      setIsEditing(true);
      setShowForm(true);
    }
  };

  const suggestionDeadline = new Date(cycle.suggestionDeadline);
  const isDeadlinePassed = suggestionDeadline <= new Date();
  const canSuggest = !userSuggestion && !isDeadlinePassed;

  return (
    <div className="space-y-6">
      {/* Phase Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">
          Suggestion Phase
        </h2>
        <p className="text-gray-300 mb-4">
          Submit your book suggestions for this voting cycle.
        </p>
        <div className="text-sm text-gray-400">
          <p>Suggestion deadline: {suggestionDeadline.toLocaleString('fi-FI')}</p>
          <p>
            Voting starts: {new Date(cycle.votingDeadline).toLocaleString('fi-FI')}
          </p>
        </div>
        {isDeadlinePassed && (
          <div className="mt-4 text-yellow-400 font-medium">
            Suggestion deadline has passed
          </div>
        )}
      </div>

      {/* User's Suggestion */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Your Suggestion
        </h3>
        {userSuggestion ? (
          <div className="bg-gray-700 rounded-md p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-bold text-orange-400">
                  {userSuggestion.title}
                </h4>
                <p className="text-gray-300">by {userSuggestion.author}</p>
              </div>
              {!isDeadlinePassed && (
                <button
                  onClick={handleEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-1"
                >
                  Edit
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>
            {userSuggestion.year && (
              <p className="text-gray-400 text-sm">
                Published: {userSuggestion.year}
              </p>
            )}
            {userSuggestion.pageCount && (
              <p className="text-gray-400 text-sm">
                Pages: {userSuggestion.pageCount}
              </p>
            )}
            {userSuggestion.link && (
              <a
                href={userSuggestion.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                {formatUrlForDisplay(userSuggestion.link)}
              </a>
            )}
            {userSuggestion.miscInfo && (
              <p className="text-gray-300 text-sm mt-2">
                {userSuggestion.miscInfo}
              </p>
            )}
          </div>
        ) : canSuggest ? (
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              You haven't submitted a suggestion yet.
            </p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 mx-auto"
            >
              {showForm ? 'Cancel' : 'Suggest a Book'}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="text-gray-400">
            {isDeadlinePassed
              ? 'The suggestion deadline has passed.'
              : 'You can only suggest one book per cycle.'}
          </p>
        )}

        {/* Suggestion Form */}
        {showForm && (canSuggest || isEditing) && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                  required
                  disabled={createSuggestionMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author *
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                  required
                  disabled={createSuggestionMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      year: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                  disabled={createSuggestionMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pages
                </label>
                <input
                  type="number"
                  value={formData.pageCount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pageCount: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                  disabled={createSuggestionMutation.isPending}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                disabled={createSuggestionMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Info
              </label>
              <textarea
                value={formData.miscInfo}
                onChange={(e) =>
                  setFormData({ ...formData, miscInfo: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-orange-500"
                disabled={createSuggestionMutation.isPending}
              />
            </div>

            {(createSuggestionMutation.error || updateSuggestionMutation.error) && (
              <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                {createSuggestionMutation.error?.message || updateSuggestionMutation.error?.message}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                type="submit"
                disabled={
                  createSuggestionMutation.isPending ||
                  updateSuggestionMutation.isPending ||
                  !formData.title.trim() ||
                  !formData.author.trim()
                }
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
              >
                {createSuggestionMutation.isPending || updateSuggestionMutation.isPending
                  ? (isEditing ? 'Updating...' : 'Submitting...')
                  : (isEditing ? 'Update Suggestion' : 'Submit Suggestion')}
                {!createSuggestionMutation.isPending && !updateSuggestionMutation.isPending && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                  disabled={createSuggestionMutation.isPending || updateSuggestionMutation.isPending}
                >
                  Cancel
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* All Suggestions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          All Suggestions ({allSuggestions.length})
        </h3>
        {allSuggestions.length === 0 ? (
          <p className="text-gray-400">No suggestions yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-gray-700 rounded-md p-4">
                <h4 className="font-bold text-orange-400">
                  {suggestion.title}
                </h4>
                <p className="text-gray-300">by {suggestion.author}</p>
                {suggestion.year && (
                  <p className="text-gray-400 text-sm">
                    Published: {suggestion.year}
                  </p>
                )}
                {suggestion.pageCount && (
                  <p className="text-gray-400 text-sm">
                    Pages: {suggestion.pageCount}
                  </p>
                )}
                {suggestion.link && (
                  <a
                    href={suggestion.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 text-sm"
                  >
                    {formatUrlForDisplay(suggestion.link)}
                  </a>
                )}
                {suggestion.miscInfo && (
                  <p className="text-gray-300 text-sm mt-2">
                    {suggestion.miscInfo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
