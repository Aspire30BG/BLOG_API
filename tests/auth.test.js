const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
jest.setTimeout(40000); 


describe('Auth Endpoints', () => {
  afterEach(async () => {
    await User.deleteMany();
  });

 it('should register a user', async () => {
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123'
    });

  console.log(res.body);
  expect(res.statusCode).toBe(201);
  });

  it('should login a user and return a token', async () => {
    await request(app)
      .post('/api/v1/auth/signup')
      .send({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: 'password123'
      });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.token).toBeDefined();
  });
});
