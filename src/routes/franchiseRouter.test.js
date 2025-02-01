const request = require('supertest');
const app = require('../service.js');
const { Role, DB } = require('../database/database.js');

const testFranchisee = { name: 'pizza diner', email: 'reg@test.com', password: 'a', roles: [{ role: Role.Franchisee }] };
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testFranchiseeAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createFranchise() {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchise = { admins: [admin], stores: [], id: '', name: randomName() };
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(franchise);
    franchise.id = franchiseRes.body.id;
    return franchise;
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
      jest.setTimeout(60 * 1000 * 5); // 5 minutes
    }
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const dinerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = dinerRes.body.token;
    testUser.id = dinerRes.body.user.id;
    expectValidJwt(testUserAuthToken);

    testFranchisee.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testFranchisee);
    testFranchiseeAuthToken = registerRes.body.token;
    testFranchisee.id = registerRes.body.user.id;
    expectValidJwt(testFranchiseeAuthToken);
  });

test('delete store', async () => {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchise = await createFranchise();
    const store = { franchiseId: franchise.id, name: randomName() };
    const storeRes = await request(app).post(`/api/franchise/${franchise.id}/store`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(store);
    const deleteRes = await request(app).delete(`/api/franchise/${franchise.id}/store/${storeRes.body.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send();
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toMatchObject({message: 'store deleted'});
});

test('create store', async () => {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchise = await createFranchise();
    const store = { franchiseId: franchise.id, name: randomName() };
    const storeRes = await request(app).post(`/api/franchise/${franchise.id}/store`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(store);
    expect(storeRes.status).toBe(200);
    expect(storeRes.body).toMatchObject({name: store.name});
});

test('delete franchise', async () => {
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const franchise = await createFranchise();
    const deleteRes = await request(app).delete(`/api/franchise/${franchise.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send();
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toMatchObject({message: 'franchise deleted'});

    const res = await request(app).get('/api/franchise').send();
    expect(res.status).toBe(200);
    expect(res.body).not.toEqual(expect.arrayContaining([expect.objectContaining({name: franchise.name})]));

});

test ('get franchises', async () => {
    const testFranchise = await createFranchise();
    const res = await request(app).get('/api/franchise').send();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({stores: [], name: testFranchise.name})]));
});

test('create franchise fail', async () => {
    const franchise = { admins: [testUser], stores: [], id: '', name: randomName() };
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(franchise);
    expect(franchiseRes.status).toBe(403);
    expect(franchiseRes.body).toMatchObject({message: 'unable to create a franchise'});
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