import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookSuggestionsApi, votesApi, queryKeys } from '../api';
import type { User, VotingCycle, BookSuggestion, Vote, AcualToskaPoints } from '../shared-types';

// Helper function to format URL for display
const formatUrlForDisplay = (url: string): string => {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  return cleanUrl.length > 20 ? cleanUrl.substring(0, 20) + '...' : cleanUrl;
};

interface VotingPhaseProps {
  cycle: VotingCycle;
  user: User;
}

export function VotingPhase({ cycle, user }: VotingPhaseProps) {
  const queryClient = useQueryClient();
  const votingDeadline = new Date(cycle.votingDeadline);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [rankedBookIds, setRankedBookIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [acualToskaPoints, setAcualToskaPoints] = useState<
    Record<string, 'want-to-read' | 'could-read' | 'wont-read'>
  >({});

  const isRankingMode = cycle.votingMode === 'ranking';
  const isAcualToskaMode = cycle.votingMode === 'acual-toska-method';

  // Fetch all book suggestions for this cycle
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
    queryFn: () => bookSuggestionsApi.getForCycle(cycle.id),
  });

  // Fetch user's current votes
  const { data: userVotes = [], isLoading: votesLoading } = useQuery({
    queryKey: queryKeys.votes.userVotes(cycle.id),
    queryFn: () => votesApi.getUserVotes(cycle.id),
    enabled: !!cycle.id,
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

      if (isRankingMode) {
        // For ranking mode, sort by points (descending) to get the original ranking
        const sortedVotes = userVotes
          .filter((vote: Vote) => {
            const suggestion = suggestions.find((s) => s.id === vote.bookSuggestionId);
            return suggestion && suggestion.userId !== user.id;
          })
          .sort((a: Vote, b: Vote) => b.points - a.points);
        setRankedBookIds(sortedVotes.map((vote: Vote) => vote.bookSuggestionId));
      } else if (isAcualToskaMode) {
        setAcualToskaPoints(userVotes.reduce((prev, cur) => ({ ...prev, [cur.bookSuggestionId]: cur.points === 3 ? 'want-to-read' : cur.points === 2 ? 'could-read' : 'wont-read' }), {}));
      } else {
        setSelectedBookIds(validVotedBookIds);
      }
    }
  }, [userVotes, suggestions, user.id, isRankingMode, isAcualToskaMode]);

  // Initialize ranking with all non-user books for ranking mode
  useEffect(() => {
    if (isRankingMode && suggestions.length > 0 && rankedBookIds.length === 0) {
      const eligibleBooks = suggestions
        .filter((s) => s.userId !== user.id)
        .map((s) => s.id);
      setRankedBookIds(eligibleBooks);
    }
  }, [isRankingMode, suggestions, user.id, rankedBookIds.length]);

  // Submit votes mutation
  const submitVotesMutation = useMutation({
    mutationFn: (voteData: { bookSuggestionIds?: string[]; orderedBookIds?: string[]; acualToskaPoints?: AcualToskaPoints[] }) =>
      votesApi.submit(voteData),
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
    if (isRankingMode) {
      submitVotesMutation.mutate({ orderedBookIds: rankedBookIds });
    } else if (isAcualToskaMode) {
      const payload = Object.entries(acualToskaPoints).map(([bookSuggestionId, acualToskaPoint]) => ({
        bookSuggestionId,
        points: acualToskaPoint,
      }));
      submitVotesMutation.mutate({ acualToskaPoints: payload });
      return;
    } else {
      submitVotesMutation.mutate({ bookSuggestionIds: selectedBookIds });
    }
  };

  // Drag and drop handlers for ranking mode
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAcualToskaChange = (
    bookId: string,
    point: 'want-to-read' | 'could-read' | 'wont-read'
  ) => {
    setAcualToskaPoints((prev) => ({
      ...prev,
      [bookId]: point,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newRankedBookIds = [...rankedBookIds];
    const draggedItem = newRankedBookIds[draggedIndex];

    // Remove the dragged item
    newRankedBookIds.splice(draggedIndex, 1);

    // Insert it at the new position
    newRankedBookIds.splice(dropIndex, 0, draggedItem);

    setRankedBookIds(newRankedBookIds);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Move item up/down functions for mobile
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newRankedBookIds = [...rankedBookIds];
    const temp = newRankedBookIds[index];
    newRankedBookIds[index] = newRankedBookIds[index - 1];
    newRankedBookIds[index - 1] = temp;
    setRankedBookIds(newRankedBookIds);
  };

  const moveItemDown = (index: number) => {
    if (index === rankedBookIds.length - 1) return;
    const newRankedBookIds = [...rankedBookIds];
    const temp = newRankedBookIds[index];
    newRankedBookIds[index] = newRankedBookIds[index + 1];
    newRankedBookIds[index + 1] = temp;
    setRankedBookIds(newRankedBookIds);
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
        {isRankingMode ? (
          <div className="text-gray-300 mb-4 space-y-2">
            <p>
              <strong>Ranking Voting:</strong> Drag and drop the books to rank them from best to worst,
              or use the up/down arrow buttons. The book at the top gets the most points, the book at the bottom gets the least.
            </p>
            <p className="text-sm text-gray-400">
              Point distribution: {suggestions.filter(s => s.userId !== user.id).length > 0 &&
                `Top book gets ${suggestions.filter(s => s.userId !== user.id).length - 1} points, 
                 second gets ${Math.max(0, suggestions.filter(s => s.userId !== user.id).length - 2)} points, 
                 and so on down to 0 points for the last book.`}
            </p>
          </div>
        ) : isAcualToskaMode ? <p className="text-gray-300 mb-4">
          <p className="py-2">For each book, select if you want to read the book, or are willing to read if others choose it, or if you absolutely will not read the book.</p>
          <p className="py-2">These give respectively 3, 2 and 0 "points" to the book.</p>
          <p className="py-2"> Remember to click Submit votes when you are ready.</p>
        </p> : (
          <p className="text-gray-300 mb-4">
            Vote for all the books that you'd like to read by clicking them.
            Finally, click the Submit votes button. You can update your votes
            afterwards too.
          </p>
        )}
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
        ) : isAcualToskaMode ?
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const currentSelection = acualToskaPoints[suggestion.id] || '';
              return (
                <div
                  key={suggestion.id}
                  className="p-4 rounded-lg border border-gray-600 bg-gray-700/50 hover:border-orange-400 transition-all"
                >
                  <h4 className="text-lg font-medium text-orange-400 mb-1">{suggestion.title}</h4>
                  <p className="text-gray-400 mb-2">by {suggestion.author} {suggestion.year ? `(${suggestion.year})` : ''}</p>
                  {suggestion.link && <p className="text-gray-400 mb-2"><a href={suggestion.link} className="underline text-blue-400 hover:text-blue-500">{suggestion.link}</a></p>}

                  <div className="text-gray-300 p-2">{suggestion.miscInfo}</div>

                  <div className="flex flex-wrap lg:gap-6 gap-2 flex-col sm:flex-row mt-2 text-sm text-gray-300 border rounded-lg border-gray-400 pl-6 p-2">
                    {['want-to-read', 'could-read', 'wont-read'].map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer text-lg">
                        <input
                          type="radio"
                          name={`toska-${suggestion.id}`}
                          value={option}
                          checked={currentSelection === option}

                          onChange={() =>
                            handleAcualToskaChange(
                              suggestion.id,
                              option as 'want-to-read' | 'could-read' | 'wont-read'
                            )
                          }
                        />
                        {option === 'want-to-read'
                          ? <span className="text-orange-300">Want to read!</span>
                          : option === 'could-read'
                            ? <span className="text-white">Could read</span>
                            : <span className="text-gray-400">Won't read</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          : isRankingMode ? (
            /* Ranking Mode - Drag and Drop Interface */
            <div className="space-y-3">
              {/* Show user's own book separately if exists */}
              {suggestions.filter(s => s.userId === user.id).map((suggestion: BookSuggestion) => (
                <div
                  key={suggestion.id}
                  className="p-4 rounded-lg border border-yellow-500 bg-yellow-500/10 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-white mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-gray-300 mb-2">
                        by {suggestion.author}
                      </p>
                      <p className="text-yellow-400 text-sm mb-2 font-medium">
                        Your suggestion - Not included in ranking
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        {suggestion.year && <span>Year: {suggestion.year}</span>}
                        {suggestion.pageCount && <span>Pages: {suggestion.pageCount}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Ranking List */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Drag to rank (best to worst):</h4>
                <div className="space-y-2">
                  {rankedBookIds.map((bookId, index) => {
                    const suggestion = suggestions.find(s => s.id === bookId);
                    if (!suggestion || suggestion.userId === user.id) return null;

                    const totalBooks = rankedBookIds.length;
                    const points = totalBooks - 1 - index;

                    return (
                      <div
                        key={bookId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 rounded-lg border transition-all cursor-move ${draggedIndex === index
                          ? 'border-orange-500 bg-orange-500/20 opacity-50'
                          : 'border-gray-600 bg-gray-800 hover:border-orange-400'
                          }`}
                      >
                        <div className="space-y-3">
                          {/* Top row: Position/Points and Up/Down buttons */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-bold text-lg">#{index + 1}</span>
                              <span className="text-gray-400 text-sm">({points} pts)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveItemUp(index);
                                }}
                                disabled={index === 0}
                                className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all"
                                title="Move up"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveItemDown(index);
                                }}
                                disabled={index === rankedBookIds.length - 1}
                                className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all"
                                title="Move down"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Middle row: Title and Author */}
                          <div>
                            <h5 className="text-white font-medium text-lg leading-tight">{suggestion.title}</h5>
                            <p className="text-gray-300 text-sm mt-1">by {suggestion.author}</p>
                          </div>

                          <div>{suggestion.miscInfo}</div>

                          {/* Bottom row: Year, Pages, Link */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            {suggestion.year && <span>Year: {suggestion.year}</span>}
                            {suggestion.pageCount && <span>Pages: {suggestion.pageCount}</span>}
                            {suggestion.link && (
                              <a
                                href={suggestion.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-400 hover:text-orange-300 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {formatUrlForDisplay(suggestion.link)}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Normal Mode - Click to Select */
            <div className="space-y-3">
              {suggestions.map((suggestion: BookSuggestion) => {
                const isSelected = selectedBookIds.includes(suggestion.id);
                const isOwnBook = suggestion.userId === user.id;

                return (
                  <div
                    key={suggestion.id}
                    onClick={() => handleBookToggle(suggestion.id, isOwnBook)}
                    className={`p-4 rounded-lg border transition-colors ${isOwnBook
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
                            {formatUrlForDisplay(suggestion.link)}
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
            <div className="flex flex-col gap-4 items-center justify-between">
              {isRankingMode ? (
                <p className="text-gray-300">
                  Ranked: {rankedBookIds.length} book
                  {rankedBookIds.length !== 1 ? 's' : ''}
                </p>
              ) : !isAcualToskaMode ? (
                <p className="text-gray-300">
                  Selected: {selectedBookIds.length} book
                  {selectedBookIds.length !== 1 ? 's' : ''}
                </p>)
                : Object.keys(acualToskaPoints).length < suggestions.length && <p className="text-gray-300">Give your vote on all books before submitting!</p>
              }

              <button
                onClick={handleSubmitVotes}
                disabled={submitVotesMutation.isPending || (isRankingMode && rankedBookIds.length === 0) || isAcualToskaMode && Object.keys(acualToskaPoints).length < suggestions.length}

                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                {submitVotesMutation.isPending
                  ? 'Submitting...'
                  : isRankingMode ? 'Submit ranking' : 'Submit votes'}
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
