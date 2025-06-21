import fastify from "fastify";
import cors from "@fastify/cors";
import { helloworldRoute } from "./routes/helloworld/route";
import { authRoute } from "./routes/auth/route";
import { votingCyclesRoute } from "./routes/voting-cycles/route";
import { bookSuggestionsRoute } from "./routes/book-suggestions/route";
import { votesRoute } from "./routes/votes/route";
import { customLogger, errorLogger } from "./middleware/logging";

const server = fastify({ logger: false });

server.register(cors, {
  origin: true
});

// Add custom logging middleware
server.addHook('onResponse', customLogger);

// Add error logging middleware
server.setErrorHandler(errorLogger);

server.register(helloworldRoute);
server.register(authRoute, { prefix: '/auth' });
server.register(votingCyclesRoute, { prefix: '/voting-cycles' });
server.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
server.register(votesRoute, { prefix: '/votes' });

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
