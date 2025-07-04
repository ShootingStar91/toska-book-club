import { db } from "../../database";
import { NewVotingCycle } from "../../database";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  BusinessLogicError,
} from "../../errors";

export interface CreateVotingCycleRequest {
  suggestionDeadline: string; // ISO date string
  votingDeadline: string; // ISO date string
  votingMode: "normal" | "ranking";
}

export interface UpdateVotingCycleRequest {
  suggestionDeadline?: string; // ISO date string
  votingDeadline?: string; // ISO date string
  votingMode?: "normal" | "ranking";
}

export interface VotingCycleResponse {
  id: string;
  suggestionDeadline: string;
  votingDeadline: string;
  status: "suggesting" | "voting" | "completed";
  votingMode: "normal" | "ranking";
  createdAt: string;
  updatedAt: string;
}

export async function createVotingCycle(
  data: CreateVotingCycleRequest
): Promise<VotingCycleResponse> {
  const { suggestionDeadline, votingDeadline, votingMode } = data;

  // Validate required fields
  if (!suggestionDeadline || !votingDeadline || !votingMode) {
    throw new ValidationError(
      "Suggestion deadline, voting deadline, and voting mode are required"
    );
  }

  // Check if there's already an active voting cycle
  const existingCycle = await getCurrentVotingCycle();
  if (existingCycle && existingCycle.status !== "completed") {
    throw new ConflictError(
      "Cannot create a new voting cycle while one is still active"
    );
  }

  // Parse and validate dates
  const suggestionDate = new Date(suggestionDeadline);
  const votingDate = new Date(votingDeadline);
  const now = new Date();

  if (isNaN(suggestionDate.getTime())) {
    throw new ValidationError("Invalid suggestion deadline format");
  }

  if (isNaN(votingDate.getTime())) {
    throw new ValidationError("Invalid voting deadline format");
  }

  if (suggestionDate <= now) {
    throw new ValidationError("Suggestion deadline must be in the future");
  }

  if (votingDate <= suggestionDate) {
    throw new ValidationError(
      "Voting deadline must be after suggestion deadline"
    );
  }

  // Create the voting cycle
  const newCycle: NewVotingCycle = {
    suggestion_deadline: suggestionDate,
    voting_deadline: votingDate,
    status: "suggesting",
    voting_mode: votingMode,
  };

  const createdCycle = await db
    .insertInto("voting_cycles")
    .values(newCycle)
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: createdCycle.id,
    suggestionDeadline: createdCycle.suggestion_deadline.toISOString(),
    votingDeadline: createdCycle.voting_deadline.toISOString(),
    status: createdCycle.status,
    votingMode: createdCycle.voting_mode,
    createdAt: createdCycle.created_at.toISOString(),
    updatedAt: createdCycle.updated_at.toISOString(),
  };
}

export async function getAllVotingCycles(): Promise<VotingCycleResponse[]> {
  const cycles = await db
    .selectFrom("voting_cycles")
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();

  return cycles.map((cycle) => ({
    id: cycle.id,
    suggestionDeadline: cycle.suggestion_deadline.toISOString(),
    votingDeadline: cycle.voting_deadline.toISOString(),
    status: cycle.status,
    votingMode: cycle.voting_mode,
    createdAt: cycle.created_at.toISOString(),
    updatedAt: cycle.updated_at.toISOString(),
  }));
}

export async function getCurrentVotingCycle(): Promise<VotingCycleResponse | null> {
  // Get the most recent cycle (including completed ones)
  const cycle = await db
    .selectFrom("voting_cycles")
    .selectAll()
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!cycle) {
    return null;
  }

  // Determine the correct status based on current time and deadlines
  // But don't override manually set 'completed' status
  const now = new Date();
  const suggestionDeadline = cycle.suggestion_deadline;
  const votingDeadline = cycle.voting_deadline;

  let currentStatus: "suggesting" | "voting" | "completed" = cycle.status;

  // Only auto-update status if not already manually completed
  if (cycle.status !== "completed") {
    if (now > votingDeadline) {
      currentStatus = "completed";
    } else if (now > suggestionDeadline) {
      currentStatus = "voting";
    } else {
      currentStatus = "suggesting";
    }

    // Update the status in the database if it has changed
    if (currentStatus !== cycle.status) {
      await db
        .updateTable("voting_cycles")
        .set({
          status: currentStatus,
          updated_at: now,
        })
        .where("id", "=", cycle.id)
        .execute();
    }
  }

  return {
    id: cycle.id,
    suggestionDeadline: cycle.suggestion_deadline.toISOString(),
    votingDeadline: cycle.voting_deadline.toISOString(),
    status: currentStatus,
    votingMode: cycle.voting_mode,
    createdAt: cycle.created_at.toISOString(),
    updatedAt: cycle.updated_at.toISOString(),
  };
}

export async function updateVotingCycle(
  cycleId: string,
  data: UpdateVotingCycleRequest
): Promise<VotingCycleResponse> {
  const { suggestionDeadline, votingDeadline, votingMode } = data;

  // Get the current cycle to validate it exists and is editable
  const existingCycle = await db
    .selectFrom("voting_cycles")
    .selectAll()
    .where("id", "=", cycleId)
    .executeTakeFirst();

  if (!existingCycle) {
    throw new NotFoundError("Voting cycle not found");
  }

  if (existingCycle.status === "completed") {
    throw new BusinessLogicError("Cannot edit a completed voting cycle");
  }

  const now = new Date();
  let updateData: any = {
    updated_at: now,
  };

  // Validate and update suggestion deadline if provided
  if (suggestionDeadline) {
    const suggestionDate = new Date(suggestionDeadline);
    if (isNaN(suggestionDate.getTime())) {
      throw new ValidationError("Invalid suggestion deadline format");
    }
    updateData.suggestion_deadline = suggestionDate;
  }

  // Validate and update voting deadline if provided
  if (votingDeadline) {
    const votingDate = new Date(votingDeadline);
    if (isNaN(votingDate.getTime())) {
      throw new ValidationError("Invalid voting deadline format");
    }

    // Check if voting deadline is after suggestion deadline
    const finalSuggestionDeadline =
      updateData.suggestion_deadline || existingCycle.suggestion_deadline;
    if (votingDate <= finalSuggestionDeadline) {
      throw new ValidationError(
        "Voting deadline must be after suggestion deadline"
      );
    }
    updateData.voting_deadline = votingDate;
  }

  // Update voting mode if provided
  if (votingMode) {
    updateData.voting_mode = votingMode;
  }

  // Update the voting cycle
  const updatedCycle = await db
    .updateTable("voting_cycles")
    .set(updateData)
    .where("id", "=", cycleId)
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: updatedCycle.id,
    suggestionDeadline: updatedCycle.suggestion_deadline.toISOString(),
    votingDeadline: updatedCycle.voting_deadline.toISOString(),
    status: updatedCycle.status,
    votingMode: updatedCycle.voting_mode,
    createdAt: updatedCycle.created_at.toISOString(),
    updatedAt: updatedCycle.updated_at.toISOString(),
  };
}
