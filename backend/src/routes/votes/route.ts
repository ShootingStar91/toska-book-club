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
      if (!request.user) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const result = await submitVotes(request.user.userId, request.body);
      return reply.status(200).send(result);
    }
  );

  // GET /votes/my/:cycleId - Get current user's votes for a cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/my/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const { cycleId } = request.params;
      const votes = await getUserVotesForCycle(request.user.userId, cycleId);

      return reply.status(200).send(votes);
    }
  );

  // GET /votes/results/:cycleId - Get vote results for a completed cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/results/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      const { cycleId } = request.params;
      const results = await getVoteResults(cycleId);

      return reply.status(200).send(results);
    }
  );
}
