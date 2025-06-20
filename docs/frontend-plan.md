# Frontend Component Plan

## Overview

The frontend consists of a single-page application with conditional rendering based on authentication state and user role. The main component determines what to display based on JWT token presence and the current voting cycle phase.

## Component Structure

### 1. App Component

**Purpose**: Root component that handles authentication state and conditional rendering

**Functionality**:

- Check for JWT token in localStorage on mount
- If no token exists, render LoginForm
- If token exists, render PhaseView
- Handle token expiration and logout

**State**:

- `token`: JWT token string or null
- `user`: User object with id, username, email, isAdmin

### 2. LoginForm Component

**Purpose**: Authentication interface for users to log into the system

**Functionality**:

- Username and password input fields
- Submit form to `/auth/login` endpoint
- Store received JWT token in localStorage
- Display error messages for invalid credentials
- Redirect to PhaseView on successful login

**State**:

- `username`: string
- `password`: string
- `error`: string or null
- `loading`: boolean

**Props**: None

### 3. PhaseView Component

**Purpose**: Main application interface that displays content based on current voting cycle phase

**Functionality**:

- Fetch current voting cycle on mount
- Determine current phase (suggesting, voting, completed/results)
- Render appropriate phase component
- Handle "no active cycle" state
- Display user info and logout button in header

**State**:

- `currentCycle`: VotingCycle object or null
- `loading`: boolean
- `error`: string or null

**Props**:

- `user`: User object
- `onLogout`: function

**Child Components**:

- SuggestingPhase
- VotingPhase
- ResultsPhase
- AdminControls (conditionally rendered if user.isAdmin)

### 4. SuggestingPhase Component

**Purpose**: Interface for book suggestion functionality

**Functionality**:

- Display current cycle deadlines
- Show form to submit book suggestions (title, author, year, pages, link, misc info)
- Display user's current suggestion if exists
- Allow editing/updating suggestion before deadline
- Show all submitted suggestions in read-only list

**State**:

- `suggestion`: User's book suggestion or null
- `allSuggestions`: Array of all book suggestions
- `formData`: Object with suggestion form fields
- `loading`: boolean
- `error`: string or null

**Props**:

- `cycle`: VotingCycle object
- `user`: User object

### 5. VotingPhase Component

**Purpose**: Interface for voting on book suggestions

**Functionality**:

- Display all book suggestions in a table/list
- Allow users to select multiple books to vote for
- Submit votes to backend (replacing previous votes)
- Show user's current votes
- Display voting deadline countdown

**State**:

- `suggestions`: Array of all book suggestions
- `selectedSuggestions`: Array of selected suggestion IDs
- `userVotes`: Array of user's current votes
- `loading`: boolean
- `error`: string or null

**Props**:

- `cycle`: VotingCycle object
- `user`: User object

### 6. ResultsPhase Component

**Purpose**: Display voting results for completed cycles

**Functionality**:

- Fetch and display vote results ordered by vote count
- Show book details (title, author, etc.) with vote counts
- Display winner prominently
- Show historical results if multiple completed cycles exist

**State**:

- `results`: Array of vote results
- `loading`: boolean
- `error`: string or null

**Props**:

- `cycle`: VotingCycle object

### 7. AdminControls Component

**Purpose**: Admin-only interface for cycle management

**Functionality**:

- Button to "Start New Cycle"
- Modal/form with suggestion deadline and voting deadline inputs
- Submit new cycle creation to `/voting-cycles` endpoint
- Form validation (future dates, voting after suggestion deadline)
- Success/error feedback

**State**:

- `showForm`: boolean
- `formData`: Object with deadline fields
- `loading`: boolean
- `error`: string or null

**Props**:

- `onCycleCreated`: function to refresh parent state

## Data Flow

1. **Authentication**: LoginForm → App (sets token) → PhaseView
2. **Phase Detection**: PhaseView fetches current cycle → renders appropriate phase component
3. **Suggestions**: SuggestingPhase ↔ `/book-suggestions` API
4. **Voting**: VotingPhase ↔ `/votes` API
5. **Results**: ResultsPhase ← `/votes/results/:cycleId` API
6. **Admin Actions**: AdminControls → `/voting-cycles` API → triggers PhaseView refresh

## Key Features

- **Responsive Design**: Mobile-friendly interface
- **Error Handling**: User-friendly error messages for all API calls
- **Loading States**: Spinners/skeletons during API requests
- **Form Validation**: Client-side validation before API submission
- **Token Management**: Automatic logout on token expiration

## API Integration

All components use TanStack Query for:

- Caching and background refetching
- Loading states
- Error handling
- Optimistic updates where appropriate

## Styling

- Dark mode theme consistent with current design
- Orange accent color for primary actions
- Clean, minimal interface focused on functionality
- Responsive grid/flexbox layouts
- Should work on mobile too
