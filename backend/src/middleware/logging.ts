import { FastifyRequest, FastifyReply } from 'fastify';

export async function customLogger(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  
  // Continue processing the request
  await reply;
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  
  // Get the method and URL path (without query parameters)
  const method = request.method;
  const url = request.url.split('?')[0]; // Remove query parameters if any
  
  // Determine authentication status
  const authStatus = request.user ? request.user.username : 'unauthenticated';
  
  // Get status code
  const statusCode = reply.statusCode;
  
  // Log in the desired format with status code and timestamp
  const timestamp = new Date().toLocaleString('fi-FI');
  console.log(`[${timestamp}] ${method} ${url} ${statusCode} ${responseTime}ms ${authStatus}`);
}

export async function errorLogger(error: Error, request: FastifyRequest, reply: FastifyReply) {
  const method = request.method;
  const url = request.url.split('?')[0];
  const authStatus = request.user ? request.user.username : 'unauthenticated';
  const timestamp = new Date().toLocaleString('fi-FI');
  
  console.error(`[${timestamp}] ERROR: ${method} ${url} ${authStatus}`);
  console.error(`[${timestamp}] Message: ${error.message}`);
  
  // Send generic error response
  reply.status(500).send({ error: 'Internal server error' });
}