import fastify from "fastify";
import cors from "@fastify/cors";
import { helloworldRoute } from "./routes/helloworld/route";
import { authRoute } from "./routes/auth/route";
import { votingCyclesRoute } from "./routes/voting-cycles/route";

const server = fastify({ logger: true });

server.register(cors, {
  origin: true
});

server.register(helloworldRoute);
server.register(authRoute, { prefix: '/auth' });
server.register(votingCyclesRoute, { prefix: '/voting-cycles' });

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
