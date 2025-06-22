import { FastifyInstance } from "fastify";
import {
  createBookSuggestion,
  getBookSuggestionsForCycle,
  getUserSuggestionForCycle,
  updateBookSuggestion,
  CreateBookSuggestionRequest,
  UpdateBookSuggestionRequest,
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
      if (!request.user) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const result = await createBookSuggestion(
        request.user.userId,
        request.body
      );
      return reply.status(201).send(result);
    }
  );

  // GET /book-suggestions/cycle/:cycleId - Get all suggestions for a cycle
  fastify.get<{ Params: { cycleId: string } }>(
    "/cycle/:cycleId",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      const { cycleId } = request.params;
      const suggestions = await getBookSuggestionsForCycle(cycleId);
      return reply.status(200).send(suggestions);
    }
  );

  // GET /book-suggestions/my/:cycleId - Get current user's suggestion for a cycle
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
    }
  );

  // PUT /book-suggestions/:id - Update existing book suggestion
  fastify.put<{ Params: { id: string }; Body: UpdateBookSuggestionRequest }>(
    "/:id",
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const { id } = request.params;
      const result = await updateBookSuggestion(
        request.user.userId,
        id,
        request.body
      );
      return reply.status(200).send(result);
    }
  );
}
