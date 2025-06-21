import { FastifyInstance } from "fastify";
import {
  submitVotes,
  getUserVotesForCycle,
  getVoteResults,
  SubmitVotesRequest,
} from "./service";
import { authenticateToken } from "../../middleware/auth";

export async function votesRoute(fastify: FastifyInstance) {
  // POST /votes - Submit votes for book suggestions
  fastify.post<{ Body: SubmitVotesRequest }>(
    "/",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "Authentication required" });
        }

        const result = await submitVotes(request.user.userId, request.body);
        return reply.status(200).send(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to submit votes";

        // Map specific errors to appropriate status codes
        if (errorMessage.includes("No active voting cycle found")) {
          return reply.status(404).send({ error: errorMessage });
        }
        if (
          errorMessage.includes("only allowed during") ||
          errorMessage.includes("deadline has passed")
        ) {
          return reply.status(403).send({ error: errorMessage });
        }
        if (
          errorMessage.includes("invalid") ||
          errorMessage.includes("not part of") ||
          errorMessage.includes("requires") ||
          errorMessage.includes("all books must be ranked") ||
          errorMessage.includes("all books except your own must be ranked") ||
          errorMessage.includes("Cannot include your own book suggestion")
        ) {
          return reply.status(400).send({ error: errorMessage });
        }
        console.log(error);
        // Generic server error
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // GET /votes/my/:cycleId - Get current user's votes for a cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/my/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "Authentication required" });
        }

        const { cycleId } = request.params;
        const votes = await getUserVotesForCycle(request.user.userId, cycleId);

        return reply.status(200).send(votes);
      } catch {
        return reply.status(500).send({ error: "Failed to fetch user votes" });
      }
    }
  );

  // GET /votes/results/:cycleId - Get vote results for a completed cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/results/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { cycleId } = request.params;
        const results = await getVoteResults(cycleId);

        return reply.status(200).send(results);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch vote results";

        if (errorMessage.includes("not found")) {
          return reply.status(404).send({ error: errorMessage });
        }
        if (errorMessage.includes("only available for completed")) {
          return reply.status(403).send({ error: errorMessage });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
