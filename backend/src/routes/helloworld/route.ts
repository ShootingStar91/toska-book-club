import { FastifyInstance } from 'fastify';
import { getHello } from './service';

export async function helloworldRoute(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return getHello();
  });
}