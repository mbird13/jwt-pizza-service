const request = require('supertest');
const app = require('../service.js');
const { Role, DB } = require('../database/database.js');

const testFranchisee = { name: 'pizza diner', email: 'reg@test.com', password: 'a', roles: [{ role: Role.Franchisee }] };
let testUserAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createFranchisee() {
    const franchisee = { name: 'franchisee', email: 'reg@test.com', password: 'a', roles: [{ role: Role.Franchisee }]};
    franchisee.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(franchisee);
    return {...registerRes.body.user, password: 'a'};
  }

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
      jest.setTimeout(60 * 1000 * 5); // 5 minutes
    }

    testFranchisee.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testFranchisee);
    testUserAuthToken = registerRes.body.token;
    testFranchisee.id = registerRes.body.user.id;
    expectValidJwt(testUserAuthToken);

  });

test('create franchise', async () => {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchise = { admins: [admin], stores: [], id: '', name: randomName() };
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(franchise);
    expect(franchiseRes.status).toBe(200);
    expect(franchiseRes.body).toMatchObject({name: franchise.name});
});

test('get franchises admin', async () => {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchiseRes = await request(app).get(`/api/franchise/${testFranchisee.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(testFranchisee);
    expect(franchiseRes.status).toBe(200);

    expect(franchiseRes.body).toEqual([]);
});

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }