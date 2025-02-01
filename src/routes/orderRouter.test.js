const request = require('supertest');
const app = require('../service.js');
const { Role, DB } = require('../database/database.js');

const testFranchisee = { name: 'pizza diner', email: 'reg@test.com', password: 'a', roles: [{ role: Role.Franchisee }] };
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testFranchiseeAuthToken;

let testMenuItem = { description: 'testing to add menu item', price: 1.99, title: 'testMenuItem', image: 'pizza1.png' };

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function addMenuItem() { 
    const admin = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(admin);
    const menuItemName = randomName();
    const menuItem = { description: 'testing to add menu item', price: 1.99, title: menuItemName, image: 'pizza1.png' };
    await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(menuItem);
    return menuItem;
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

    testMenuItem = await addMenuItem();

  });

test('get orders', async () => {
  const ordersRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send();
  expect(ordersRes.status).toBe(200);
  expect(ordersRes.body).toMatchObject({dinerId: testUser.id});
});

test('creat order', async () => {
  const order = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] };
  const orderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(order);
  expect(orderRes.status).toBe(200);
  expect(orderRes.body).toMatchObject({order: order});
});

test('get menu', async () => {
  const menuRes = await request(app).get('/api/order/menu').send();
  expect(menuRes.status).toBe(200);
  expect(menuRes.body).toEqual(expect.arrayContaining([expect.objectContaining(testMenuItem)]));
});

test('add menu item', async () => {
  const admin = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(admin);
  const menuItemName = await randomName();
  const menuItem = { description: 'testing to add menu item', price: 1.99, title: menuItemName, image: 'pizza1.png' };
  const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(menuItem);
  expect(addMenuItemRes.status).toBe(200);
  expect(addMenuItemRes.body).toEqual(expect.arrayContaining([expect.objectContaining(menuItem)]));
});



function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }