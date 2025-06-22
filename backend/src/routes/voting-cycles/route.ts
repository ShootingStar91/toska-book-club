import { FastifyInstance } from 'fastify';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle, updateVotingCycle, CreateVotingCycleRequest, UpdateVotingCycleRequest } from './service';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export async function votingCyclesRoute(fastify: FastifyInstance) {
  // POST /voting-cycles - Create new voting cycle (admin only)
  fastify.post<{ Body: CreateVotingCycleRequest }>('/', {
    preHandler: [authenticateToken, requireAdmin]
  }, async (request, reply) => {
    const result = await createVotingCycle(request.body);
    return reply.status(201).send(result);
  });

  // GET /voting-cycles - Get all voting cycles
  fastify.get('/', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const cycles = await getAllVotingCycles();
    return reply.status(200).send(cycles);
  });

  // GET /voting-cycles/current - Get current active voting cycle
  fastify.get('/current', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const cycle = await getCurrentVotingCycle();
    if (!cycle) {
      return reply.status(404).send({ error: 'No active voting cycle found' });
    }
    return reply.status(200).send(cycle);
  });

  // PUT /voting-cycles/:id - Update voting cycle deadlines (admin only)
  fastify.put<{ Params: { id: string }, Body: UpdateVotingCycleRequest }>('/:id', {
    preHandler: [authenticateToken, requireAdmin]
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await updateVotingCycle(id, request.body);
    return reply.status(200).send(result);
  });
}