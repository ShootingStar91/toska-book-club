import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import { authRoute } from './route';
import { testDb } from '../../test-database';

describe('Registration Integration', () => {
  it('should actually create user in database', async () => {
    const app = fastify();
    app.register(authRoute);
    
    await app.ready();
    
    const response = await request(app.server)
      .post('/register')
      .send({
        username: 'dbuser',
        password: 'password123',
        email: 'dbuser@example.com',
        secret: 'valid-secret'
      });
    
    expect(response.status).toBe(201);
    
    // Verify user was actually created in database
    const user = await testDb
      .selectFrom('users')
      .select(['username', 'email', 'is_admin'])
      .where('username', '=', 'dbuser')
      .executeTakeFirst();
    
    expect(user).toBeDefined();
    expect(user?.username).toBe('dbuser');
    expect(user?.email).toBe('dbuser@example.com');
    expect(user?.is_admin).toBe(false);
    
    await app.close();
  });
});