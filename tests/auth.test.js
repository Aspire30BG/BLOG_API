const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');

jest.setTimeout(40000); 

async function loginAndGetToken() {
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

  return res.body.token;
}

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

    expect(res.statusCode).toBe(201);
  });

  it('should login a user and return a token', async () => {
    const token = await loginAndGetToken();

    expect(token).toBeDefined();
  });
});

module.exports = { loginAndGetToken };
