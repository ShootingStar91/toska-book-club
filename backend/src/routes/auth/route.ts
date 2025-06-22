import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  authenticateUser,
  registerUser,
  LoginRequest,
  RegisterRequest,
} from "./service";

export async function authRoute(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: LoginRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { username, password } = request.body;

        if (!username || !password) {
          return reply
            .status(400)
            .send({ error: "Username and password are required" });
        }

        const result = await authenticateUser(username, password);
        return reply.status(200).send(result);
      } catch {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
    }
  );

  fastify.post(
    "/register",
    async (
      request: FastifyRequest<{ Body: RegisterRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const result = await registerUser(request.body);
        return reply.status(201).send(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Registration failed";

        // Map specific errors to appropriate status codes
        if (errorMessage.includes("required")) {
          return reply.status(400).send({ error: errorMessage });
        }
        if (errorMessage.includes("Invalid email format")) {
          return reply.status(400).send({ error: errorMessage });
        }
        if (errorMessage.includes("Password must be")) {
          return reply.status(400).send({ error: errorMessage });
        }
        if (errorMessage.includes("Invalid registration secret")) {
          return reply.status(403).send({ error: errorMessage });
        }
        if (errorMessage.includes("already exists")) {
          return reply.status(409).send({ error: errorMessage });
        }
        console.log("error: ", error);
        // Generic server error
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
