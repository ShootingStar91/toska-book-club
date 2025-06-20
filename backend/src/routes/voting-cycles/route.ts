import { FastifyInstance } from 'fastify';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle, CreateVotingCycleRequest } from './service';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export async function votingCyclesRoute(fastify: FastifyInstance) {
  // POST /voting-cycles - Create new voting cycle (admin only)
  fastify.post<{ Body: CreateVotingCycleRequest }>('/', {
    preHandler: [authenticateToken, requireAdmin]
  }, async (request, reply) => {
    try {
      const result = await createVotingCycle(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create voting cycle';
      
      // Map specific errors to appropriate status codes
      if (errorMessage.includes('required')) {
        return reply.status(400).send({ error: errorMessage });
      }
      if (errorMessage.includes('Invalid') && errorMessage.includes('format')) {
        return reply.status(400).send({ error: errorMessage });
      }
      if (errorMessage.includes('must be in the future') || errorMessage.includes('must be after')) {
        return reply.status(400).send({ error: errorMessage });
      }
      if (errorMessage.includes('already exists')) {
        return reply.status(409).send({ error: errorMessage });
      }
      
      // Generic server error
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /voting-cycles - Get all voting cycles
  fastify.get('/', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const cycles = await getAllVotingCycles();
      return reply.status(200).send(cycles);
    } catch {
      return reply.status(500).send({ error: 'Failed to fetch voting cycles' });
    }
  });

  // GET /voting-cycles/current - Get current active voting cycle
  fastify.get('/current', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const cycle = await getCurrentVotingCycle();
      if (!cycle) {
        return reply.status(404).send({ error: 'No active voting cycle found' });
      }
      return reply.status(200).send(cycle);
    } catch {
      return reply.status(500).send({ error: 'Failed to fetch current voting cycle' });
    }
  });
}