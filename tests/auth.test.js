const mongoose = require("mongoose");
const User = require("../models/userModel");
const request = require("supertest");
const app = require("../app");
const { faker } = require("@faker-js/faker");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI); // use a real or test DB URI
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("Signup API with dynamic data", () => {
  const endpoint = "api/auth/signup";

  const generateValidUser = () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: "9874152579",
    password: "Random@587",
    isAccepted: true,
  });

  const generateInvalidUser = (overrides = {}) => ({
    firstName: "a", // too short
    lastName: "1", // not valid letters
    email: "not-an-email",
    phone: 8794584569,
    password: "123", // weak
    isAccepted: false,
    ...overrides,
  });

  it("should signup successfully with valid data", async () => {
    const user = generateValidUser();
    console.log("Valid user sent to API:", user);

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  it("should fail with invalid email", async () => {
    const user = generateValidUser();
    user.email = "invalidEmail";

    console.log("Invalid email sent to API:", user);

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(400);
  });

  it("should fail with weak password", async () => {
    const user = generateValidUser();
    user.password = "123";

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(400);
  });

  it("should fail when isAccepted is false", async () => {
    const user = generateValidUser();
    user.isAccepted = false;

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(400);
  });

  it("should fail when firstName has numbers", async () => {
    const user = generateValidUser();
    user.firstName = "john123";

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(400);
  });

  it("should fail when missing required fields", async () => {
    const user = {}; // Empty object

    const res = await request(app).post(endpoint).send(user);

    console.log("Response body:", res.body);

    expect(res.statusCode).toBe(400);
  });
});
