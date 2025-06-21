import { QueryClient } from '@tanstack/react-query';
import type {
  User,
  VotingCycle,
  BookSuggestion,
  LoginRequest,
  LoginResponse,
  CreateBookSuggestionRequest,
  CreateVotingCycleRequest,
  UpdateVotingCycleRequest,
  SubmitVotesRequest,
  Vote,
  VoteResult,
} from './shared-types';

// Additional types for frontend
interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  secret: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
}
import { getValidToken } from './auth';

const API_BASE_URL = 'http://localhost:3000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getValidToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    return apiRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// Voting Cycles API
export const votingCyclesApi = {
  getCurrent: async (): Promise<VotingCycle> => {
    return apiRequest<VotingCycle>('/voting-cycles/current');
  },
  
  getAll: async (): Promise<VotingCycle[]> => {
    return apiRequest<VotingCycle[]>('/voting-cycles');
  },
  
  create: async (data: CreateVotingCycleRequest): Promise<VotingCycle> => {
    return apiRequest<VotingCycle>('/voting-cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (cycleId: string, data: UpdateVotingCycleRequest): Promise<VotingCycle> => {
    return apiRequest<VotingCycle>(`/voting-cycles/${cycleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Book Suggestions API
export const bookSuggestionsApi = {
  getForCycle: async (cycleId: string): Promise<BookSuggestion[]> => {
    return apiRequest<BookSuggestion[]>(`/book-suggestions/cycle/${cycleId}`);
  },
  
  getUserSuggestion: async (cycleId: string): Promise<BookSuggestion> => {
    return apiRequest<BookSuggestion>(`/book-suggestions/my/${cycleId}`);
  },
  
  create: async (data: CreateBookSuggestionRequest): Promise<BookSuggestion> => {
    return apiRequest<BookSuggestion>('/book-suggestions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Votes API
export const votesApi = {
  submit: async (data: SubmitVotesRequest): Promise<Vote[]> => {
    return apiRequest<Vote[]>('/votes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getUserVotes: async (cycleId: string): Promise<Vote[]> => {
    return apiRequest<Vote[]>(`/votes/my/${cycleId}`);
  },
  
  getResults: async (cycleId: string): Promise<VoteResult[]> => {
    return apiRequest<VoteResult[]>(`/votes/results/${cycleId}`);
  },
};

// React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) {
          return false; // Don't retry auth errors
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Query keys
export const queryKeys = {
  votingCycles: {
    all: ['votingCycles'] as const,
    current: ['votingCycles', 'current'] as const,
  },
  bookSuggestions: {
    all: ['bookSuggestions'] as const,
    forCycle: (cycleId: string) => ['bookSuggestions', 'cycle', cycleId] as const,
    userSuggestion: (cycleId: string) => ['bookSuggestions', 'my', cycleId] as const,
  },
  votes: {
    all: ['votes'] as const,
    userVotes: (cycleId: string) => ['votes', 'my', cycleId] as const,
    results: (cycleId: string) => ['votes', 'results', cycleId] as const,
  },
} as const;