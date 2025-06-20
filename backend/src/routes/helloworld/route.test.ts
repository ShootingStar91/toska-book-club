import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import { helloworldRoute } from './route';

describe('Hello World Route', () => {
  it('should return Hello world on GET /', async () => {
    const app = fastify();
    app.register(helloworldRoute);
    
    await app.ready();
    
    const response = await request(app.server).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello world');
    
    await app.close();
  });
});