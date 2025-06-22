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
      const { username, password } = request.body;

      if (!username || !password) {
        return reply
          .status(400)
          .send({ error: "Username and password are required" });
      }

      const result = await authenticateUser(username, password);
      return reply.status(200).send(result);
    }
  );

  fastify.post(
    "/register",
    async (
      request: FastifyRequest<{ Body: RegisterRequest }>,
      reply: FastifyReply
    ) => {
      const result = await registerUser(request.body);
      return reply.status(201).send(result);
    }
  );
}
