import { useQuery } from '@tanstack/react-query';
import { votesApi, bookSuggestionsApi, queryKeys } from '../api';
import type { VotingCycle, VoteResult, BookSuggestion } from '../shared-types';

// Helper function to format URL for display
const formatUrlForDisplay = (url: string): string => {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  return cleanUrl.length > 30 ? cleanUrl.substring(0, 30) + '...' : cleanUrl;
};

interface ResultsPhaseProps {
  cycle: VotingCycle;
}

export function ResultsPhase({ cycle }: ResultsPhaseProps) {
  // Fetch vote results
  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: queryKeys.votes.results(cycle.id),
    queryFn: () => votesApi.getResults(cycle.id),
  });

  // Fetch all book suggestions to get full details
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: queryKeys.bookSuggestions.forCycle(cycle.id),
    queryFn: () => bookSuggestionsApi.getForCycle(cycle.id),
  });

  if (resultsLoading || suggestionsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4">Results</h2>
          <p className="text-gray-300">Loading results...</p>
        </div>
      </div>
    );
  }

  // Create results for all suggestions, including those with no votes
  const allResults = suggestions.map((suggestion: BookSuggestion) => {
    const voteResult = results.find(
      (result: VoteResult) => result.bookSuggestionId === suggestion.id
    );
    return {
      bookSuggestionId: suggestion.id,
      voteCount: voteResult ? voteResult.voteCount : 0,
      suggestion,
    };
  });

  // Sort by vote count (highest first), then by title for consistent ordering
  const sortedResults = allResults.sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    return a.suggestion.title.localeCompare(b.suggestion.title);
  });

  // Determine winner(s) - books with the highest vote count
  const maxVotes = sortedResults.length > 0 ? sortedResults[0].voteCount : 0;
  const tiedResults = sortedResults.filter(
    (result) => result.voteCount === maxVotes && result.voteCount > 0
  );

  // Function to determine winner from tied results using UUID-based selection
  const determineWinner = (tiedResults: typeof sortedResults) => {
    if (tiedResults.length <= 1) return tiedResults[0] || null;

    // Sort by UUID to get deterministic "random" winner
    const sortedByUuid = [...tiedResults].sort((a, b) =>
      a.bookSuggestionId.localeCompare(b.bookSuggestionId)
    );
    return sortedByUuid[0];
  };

  const actualWinner = determineWinner(tiedResults);
  const isTie = tiedResults.length > 1;

  const totalVotes = sortedResults.reduce(
    (sum: number, result) => sum + result.voteCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">
          Voting Results
        </h2>
        <p className="text-gray-300 mb-4">
          Voting has ended. Here are the final results!
        </p>
        <div className="text-sm text-gray-400">
          <p>
            Cycle ended:{' '}
            {new Date(cycle.votingDeadline).toLocaleString('fi-FI')}
          </p>
          <p>Total votes cast: {totalVotes}</p>
          <p>Books in competition: {sortedResults.length}</p>
        </div>
      </div>

      {sortedResults.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-center">
            No votes were cast in this cycle.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-4">
            {sortedResults.map((result, index) => {
              const isActualWinner =
                actualWinner &&
                result.bookSuggestionId === actualWinner.bookSuggestionId;
              const isTiedForFirst = tiedResults.some(
                (w) => w.bookSuggestionId === result.bookSuggestionId
              );
              const suggestion = result.suggestion!;

              return (
                <div
                  key={result.bookSuggestionId}
                  className={`relative p-4 rounded-lg border transition-all ${
                    isActualWinner
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-400/30 via-amber-400/25 to-orange-400/20 shadow-lg ring-2 ring-yellow-400/50'
                      : isTiedForFirst && isTie
                        ? 'border-orange-400/70 bg-orange-400/5'
                        : 'border-gray-600 bg-gray-700/50'
                  }`}
                >
                  {/* Winner crown/indicator - only for actual winner */}
                  {isActualWinner && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-yellow-400 text-gray-900 rounded-full p-2">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* First row: Position and Vote count */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-lg font-bold ${
                          isActualWinner ? 'text-yellow-400' : 'text-orange-400'
                        }`}
                      >
                        #{index + 1}{isActualWinner && ' 🎉'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-bold ${
                            isActualWinner
                              ? 'text-yellow-400'
                              : 'text-orange-400'
                          }`}
                        >
                          {result.voteCount}
                        </span>
                        <span className="text-sm text-gray-400">
                          {result.voteCount === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>
                    </div>

                    {/* Second row: Title and badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-lg font-medium leading-tight ${
                          isActualWinner ? 'text-yellow-100' : 'text-white'
                        }`}
                      >
                        {suggestion.title}
                      </h4>
                      {isActualWinner && (
                        <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs font-bold">
                          WINNER
                        </span>
                      )}
                      {isTiedForFirst && isTie && !isActualWinner && (
                        <span className="bg-orange-400/20 text-orange-300 px-2 py-1 rounded-full text-xs font-medium border border-orange-400/50">
                          TIED FOR 1ST
                        </span>
                      )}
                    </div>

                    {/* Third row: Author */}
                    <p className="text-gray-300">by {suggestion.author}</p>

                    {/* Bottom section: Year/Pages, Link, Description - closer together */}
                    <div className="space-y-1">
                      {/* Year and Pages */}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        {suggestion.year && <span>Year: {suggestion.year}</span>}
                        {suggestion.pageCount && (
                          <span>Pages: {suggestion.pageCount}</span>
                        )}
                      </div>

                      {/* Link */}
                      {suggestion.link && (
                        <a
                          href={suggestion.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-sm inline-block"
                        >
                          {formatUrlForDisplay(suggestion.link)}
                        </a>
                      )}

                      {/* Misc info */}
                      {suggestion.miscInfo && (
                        <p className="text-gray-400 text-sm">
                          {suggestion.miscInfo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isTie && actualWinner && (
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-400/50 rounded-lg">
              <p className="text-yellow-300 font-medium text-center mb-2">
                🎉 We have a tie! {tiedResults.length} books tied for first
                place with {maxVotes} {maxVotes === 1 ? 'vote' : 'votes'} each.
              </p>
              <p className="text-yellow-200 text-sm text-center">
                Winner "{actualWinner.suggestion!.title}" was determined by
                randomized tiebreaker.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
