import fastify from "fastify";
import cors from "@fastify/cors";
import { authRoute } from "./routes/auth/route";
import { votingCyclesRoute } from "./routes/voting-cycles/route";
import { bookSuggestionsRoute } from "./routes/book-suggestions/route";
import { votesRoute } from "./routes/votes/route";
import { onRequestLogger, onResponseLogger, errorHandler } from "./middleware/logging";

const HOST = "0.0.0.0";
const PORT = 3000;

const server = fastify({ logger: false });

server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Add custom logging middleware
server.addHook('onRequest', onRequestLogger);
server.addHook('onResponse', onResponseLogger);

// Add error handling middleware
server.setErrorHandler(errorHandler);

server.register(authRoute, { prefix: '/auth' });
server.register(votingCyclesRoute, { prefix: '/voting-cycles' });
server.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
server.register(votesRoute, { prefix: '/votes' });

const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    server.log.error(err);
    process.exit(1);
  }
};

start();
