// Shared types for frontend and backend

export type AcualToskaPoint = 'want-to-read' | 'could-read' | 'wont-read';

export interface AcualToskaPoints {
  bookSuggestionId: string;
  points: AcualToskaPoint;
}

export interface SubmitVotesRequest {
  // For normal mode (backward compatibility)
  bookSuggestionIds?: string[];
  // For ranking mode - books ordered from best (most points) to worst (least points)
  orderedBookIds?: string[];
  // For acual-toska-method
  acualToskaPoints?: AcualToskaPoints[];
}

export type VotingMode = 'normal' | 'ranking' | 'acual-toska-method';

export interface VotingCycle {
  id: string;
  suggestionDeadline: string;
  votingDeadline: string;
  status: 'suggesting' | 'voting' | 'completed';
  votingMode: VotingMode;
  createdAt: string;
  updatedAt: string;
}

export interface BookSuggestion {
  id: string;
  userId: string;
  votingCycleId: string;
  title: string;
  author: string;
  year: number | null;
  pageCount: number | null;
  link: string | null;
  miscInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookSuggestionRequest {
  title: string;
  author: string;
  year?: number;
  pageCount?: number;
  link?: string;
  miscInfo?: string;
}

export interface UpdateBookSuggestionRequest {
  title?: string;
  author?: string;
  year?: number;
  pageCount?: number;
  link?: string;
  miscInfo?: string;
}

export interface Vote {
  id: string;
  userId: string;
  votingCycleId: string;
  bookSuggestionId: string;
  points: number;
  createdAt: string;
}

export interface VoteResult {
  bookSuggestionId: string;
  title: string;
  author: string;
  voteCount: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  };
}

export interface CreateVotingCycleRequest {
  suggestionDeadline: string;
  votingDeadline: string;
  votingMode: VotingMode;
}

export interface UpdateVotingCycleRequest {
  suggestionDeadline?: string;
  votingDeadline?: string;
  votingMode?: VotingMode;
}

export interface SubmitVotesRequest {
  // For normal mode (backward compatibility)
  bookSuggestionIds?: string[];
  // For ranking mode - books ordered from best (most points) to worst (least points)
  orderedBookIds?: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}
