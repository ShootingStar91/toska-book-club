import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookSuggestionsApi, queryKeys } from '../api';
import type {
  CreateBookSuggestionRequest,
  User,
  VotingCycle,
} from '../shared-types';

interface SuggestingPhaseProps {
  cycle: VotingCycle;
  user: User;
}

export function SuggestingPhase({ cycle }: SuggestingPhaseProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
      setFormData({
        title: '',
        author: '',
        year: undefined,
        pageCount: undefined,
        link: '',
        miscInfo: '',
      });
    },
  });

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
      createSuggestionMutation.mutate(submitData);
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
          <p>Suggestion deadline: {suggestionDeadline.toLocaleString()}</p>
          <p>
            Voting starts: {new Date(cycle.votingDeadline).toLocaleString()}
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
            <h4 className="font-bold text-orange-400">
              {userSuggestion.title}
            </h4>
            <p className="text-gray-300">by {userSuggestion.author}</p>
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
                More info
              </a>
            )}
            {userSuggestion.miscInfo && (
              <p className="text-gray-300 text-sm mt-2">
                {userSuggestion.miscInfo}
              </p>
            )}
          </div>
        ) : canSuggest ? (
          <div>
            <p className="text-gray-400 mb-4">
              You haven't submitted a suggestion yet.
            </p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              {showForm ? 'Cancel' : 'Suggest a Book'}
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
        {showForm && canSuggest && (
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

            {createSuggestionMutation.error && (
              <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                {createSuggestionMutation.error.message}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={
                  createSuggestionMutation.isPending ||
                  !formData.title.trim() ||
                  !formData.author.trim()
                }
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
              >
                {createSuggestionMutation.isPending
                  ? 'Submitting...'
                  : 'Submit Suggestion'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                disabled={createSuggestionMutation.isPending}
              >
                Cancel
              </button>
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
                    More info
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
