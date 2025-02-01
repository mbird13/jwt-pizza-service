const request = require('supertest');
const app = require('../service.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createDinerUser() {
    const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(user);
    return {...registerRes.body.user, password: 'a'};
  }

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }

  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUser.id = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('register', async () => {
  const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(user);
  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);

  const expectedUser = { ...user, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(registerRes.body.user).toMatchObject(expectedUser);
});

test('register fail', async () => {
  const user = { name: 'pizza diner', email: 'reg@test.com', password: '' };
  user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(user);

  expect(registerRes.status).toBe(400);
  expect(registerRes.body).toMatchObject({ message: 'name, email, and password are required' });
});

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: 'logout successful' });
});

test('update user', async () => {
  let user = await createDinerUser();
  let newInfo = { userId: user.id, email: 'reg@test.com', password: 'newPassword' };
  newInfo.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const admin = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(admin);
  const updateRes = await request(app).put(`/api/auth/${user.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(newInfo);
  expect(updateRes.status).toBe(200);

  expect(updateRes.body).toMatchObject({ email: newInfo.email });
});

test('update user unauthorized', async () => {
  let user = await createDinerUser();
  let newInfo = { userId: user.id, email: 'reg@test.com', password: 'newPassword' };
  newInfo.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const updateRes = await request(app).put(`/api/auth/${user.id}`).set('Authorization', `Bearer ${user.token}`).send(newInfo);
  expect(updateRes.status).toBe(401);
});


function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}