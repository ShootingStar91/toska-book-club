import { FastifyInstance } from 'fastify';
import { getHello } from './service';

export async function helloworldRoute(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return getHello();
  });
}