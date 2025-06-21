import { FastifyInstance } from "fastify";
import {
  createBookSuggestion,
  getBookSuggestionsForCycle,
  getUserSuggestionForCycle,
  CreateBookSuggestionRequest,
} from "./service";
import { authenticateToken } from "../../middleware/auth";

export async function bookSuggestionsRoute(fastify: FastifyInstance) {
  // POST /book-suggestions - Create new book suggestion
  fastify.post<{ Body: CreateBookSuggestionRequest }>(
    "/",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "Authentication required" });
        }

        const result = await createBookSuggestion(
          request.user.userId,
          request.body
        );
        return reply.status(201).send(result);
      } catch (error) {
        // Log the actual error for debugging
        const timestamp = new Date().toLocaleString("fi-FI");
        console.error(
          `[${timestamp}] POST /book-suggestions error:`,
          error instanceof Error ? error.message : error
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create book suggestion";

        // Map specific errors to appropriate status codes
        if (errorMessage.includes("required")) {
          return reply.status(400).send({ error: errorMessage });
        }
        if (errorMessage.includes("No active voting cycle found")) {
          return reply.status(404).send({ error: errorMessage });
        }
        if (
          errorMessage.includes("only allowed during") ||
          errorMessage.includes("deadline has passed")
        ) {
          return reply.status(403).send({ error: errorMessage });
        }
        if (errorMessage.includes("only suggest one book")) {
          return reply.status(409).send({ error: errorMessage });
        }

        // Generic server error
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // GET /book-suggestions/cycle/:cycleId - Get all suggestions for a cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/cycle/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { cycleId } = request.params;
        const suggestions = await getBookSuggestionsForCycle(cycleId);
        return reply.status(200).send(suggestions);
      } catch {
        return reply
          .status(500)
          .send({ error: "Failed to fetch book suggestions" });
      }
    }
  );

  // GET /book-suggestions/my/:cycleId - Get current user's suggestion for a cycle
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
        const suggestion = await getUserSuggestionForCycle(
          request.user.userId,
          cycleId
        );

        if (!suggestion) {
          return reply
            .status(404)
            .send({ error: "No suggestion found for this cycle" });
        }

        return reply.status(200).send(suggestion);
      } catch {
        return reply
          .status(500)
          .send({ error: "Failed to fetch user suggestion" });
      }
    }
  );
}
