import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors';

export async function onRequestLogger(request: FastifyRequest) {
  // Store start time on request object
  (request as any).startTime = Date.now();
}

export async function onResponseLogger(request: FastifyRequest, reply: FastifyReply) {
  // Calculate response time
  const startTime = (request as any).startTime || Date.now();
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

export async function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  const method = request.method;
  const url = request.url.split('?')[0];
  const authStatus = request.user ? request.user.username : 'unauthenticated';
  const timestamp = new Date().toLocaleString('fi-FI');
  
  // Handle custom application errors
  if (error instanceof AppError) {
    console.error(`[${timestamp}] ${error.errorCode}: ${method} ${url} ${authStatus}`);
    console.error(`[${timestamp}] Message: ${error.message}`);
    
    reply.status(error.statusCode).send({
      error: error.message
    });
    return;
  }
  
  // Handle unexpected errors
  console.error(`[${timestamp}] UNEXPECTED_ERROR: ${method} ${url} ${authStatus}`);
  console.error(`[${timestamp}] Message: ${error.message}`);
  console.error(`[${timestamp}] Stack: ${error.stack}`);
  
  reply.status(500).send({
    error: 'Internal server error'
  });
}