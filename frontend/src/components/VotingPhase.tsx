import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookSuggestionsApi, votesApi, queryKeys } from '../api';
import type { User, VotingCycle, BookSuggestion, Vote } from '../shared-types';

interface VotingPhaseProps {
  cycle: VotingCycle;
  user: User;
}

export function VotingPhase({ cycle, user }: VotingPhaseProps) {
  const queryClient = useQueryClient();
  const votingDeadline = new Date(cycle.votingDeadline);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  // Fetch all book suggestions for this cycle
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
    queryFn: () => bookSuggestionsApi.getForCycle(cycle.id),
  });

  // Fetch user's current votes
  const { data: userVotes = [], isLoading: votesLoading } = useQuery({
    queryKey: queryKeys.votes.userVotes(cycle.id),
    queryFn: () => votesApi.getUserVotes(cycle.id),
  });

  // Initialize selected books from existing votes
  useEffect(() => {
    if (userVotes.length > 0) {
      const votedBookIds = userVotes.map((vote: Vote) => vote.bookSuggestionId);
      // Filter out user's own book if it somehow got voted for
      const validVotedBookIds = votedBookIds.filter((bookId) => {
        const suggestion = suggestions.find((s) => s.id === bookId);
        return suggestion && suggestion.userId !== user.id;
      });
      setSelectedBookIds(validVotedBookIds);
    }
  }, [userVotes, suggestions, user.id]);

  // Submit votes mutation
  const submitVotesMutation = useMutation({
    mutationFn: (bookSuggestionIds: string[]) =>
      votesApi.submit({ bookSuggestionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.votes.userVotes(cycle.id),
      });
    },
  });

  const handleBookToggle = (bookId: string, isOwnBook: boolean) => {
    // Prevent voting for own book
    if (isOwnBook) {
      return;
    }

    setSelectedBookIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleSubmitVotes = () => {
    submitVotesMutation.mutate(selectedBookIds);
  };

  if (suggestionsLoading || votesLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4">
            Voting Phase
          </h2>
          <p className="text-gray-300">Loading suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">
          Voting Phase
        </h2>
        <p className="text-gray-300 mb-4">
          Vote for all the books that you'd like to read by clicking them.
          Finally, click the Submit votes button. You can update your votes
          afterwards too.
        </p>
        <div className="text-sm text-gray-400">
          <p>Voting deadline: {votingDeadline.toLocaleString('fi-FI')}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Book Suggestions ({suggestions.length})
        </h3>

        {suggestions.length === 0 ? (
          <p className="text-gray-400">
            No book suggestions available for voting.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion: BookSuggestion) => {
              const isSelected = selectedBookIds.includes(suggestion.id);
              const isOwnBook = suggestion.userId === user.id;

              return (
                <div
                  key={suggestion.id}
                  onClick={() => handleBookToggle(suggestion.id, isOwnBook)}
                  className={`p-4 rounded-lg border transition-colors ${
                    isOwnBook
                      ? 'border-yellow-500 bg-yellow-500/10 cursor-not-allowed'
                      : isSelected
                        ? 'border-orange-500 bg-orange-500/10 cursor-pointer'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-white mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-gray-300 mb-2">
                        by {suggestion.author}
                      </p>

                      {isOwnBook && (
                        <p className="text-yellow-400 text-sm mb-2 font-medium">
                          Your suggestion - Cannot vote for your own book
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        {suggestion.year && (
                          <span>Year: {suggestion.year}</span>
                        )}
                        {suggestion.pageCount && (
                          <span>Pages: {suggestion.pageCount}</span>
                        )}
                      </div>

                      {suggestion.link && (
                        <a
                          href={suggestion.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-sm mt-2 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Link →
                        </a>
                      )}

                      {suggestion.miscInfo && (
                        <p className="text-gray-400 text-sm mt-2">
                          {suggestion.miscInfo}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      {isSelected && !isOwnBook && (
                        <div className="text-orange-500">
                          <svg
                            className="w-6 h-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                      {isOwnBook && (
                        <div className="text-yellow-500">
                          <svg
                            className="w-6 h-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-gray-300">
                Selected: {selectedBookIds.length} book
                {selectedBookIds.length !== 1 ? 's' : ''}
              </p>

              <button
                onClick={handleSubmitVotes}
                disabled={submitVotesMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                {submitVotesMutation.isPending
                  ? 'Submitting...'
                  : 'Submit votes'}
                {!submitVotesMutation.isPending && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>

            {submitVotesMutation.error && (
              <div className="mt-3 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                {submitVotesMutation.error.message}
              </div>
            )}

            {submitVotesMutation.isSuccess && (
              <div className="mt-3 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-md text-sm">
                Votes submitted successfully!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
