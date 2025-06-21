import { FastifyInstance } from 'fastify';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle, updateVotingCycle, CreateVotingCycleRequest, UpdateVotingCycleRequest } from './service';
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
      if (errorMessage.includes('already exists') || errorMessage.includes('already an active') || errorMessage.includes('while one is still active')) {
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

  // PUT /voting-cycles/:id - Update voting cycle deadlines (admin only)
  fastify.put<{ Params: { id: string }, Body: UpdateVotingCycleRequest }>('/:id', {
    preHandler: [authenticateToken, requireAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await updateVotingCycle(id, request.body);
      return reply.status(200).send(result);
    } catch (error) {
      const timestamp = new Date().toLocaleString('fi-FI');
      console.error(`[${timestamp}] PUT /voting-cycles/${request.params.id} error:`, error instanceof Error ? error.message : error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update voting cycle';
      
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
      if (errorMessage.includes('not found')) {
        return reply.status(404).send({ error: errorMessage });
      }
      if (errorMessage.includes('Cannot edit') || errorMessage.includes('completed')) {
        return reply.status(403).send({ error: errorMessage });
      }
      
      // Generic server error
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}