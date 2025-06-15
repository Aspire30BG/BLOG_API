const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { loginAndGetToken } = require('./auth.test');
const { MongoMemoryServer } = require("mongodb-memory-server");
jest.setTimeout(50000);

let token;
let blogId;
let testUserId;
let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Disconnect if already connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Connect to in-memory DB
  await mongoose.connect(uri);

  // Create test user manually
  const user = new User({
    first_name: "Test",
    last_name: "User",
    email: "testuser@example.com",
    password: "password123", // Assume hashed in model middleware
  });
  await user.save();
  testUserId = user._id;

  // Generate JWT manually
  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "testsecret", {
    expiresIn: "1d",
  });

  // Create and publish blog
  const blog = new Blog({
    title: "Public Blog",
    description: "This blog is visible to all.",
    body: "Some public content.",
    tags: ["public", "test"],
    author: user._id,
  });

  await blog.save();
  blog.state = "published";
  await blog.save();
  blogId = blog._id;
});

afterEach(async () => {
  // Clear all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Recreate test user and blog for each test block
  const user = new User({
    first_name: "Test",
    last_name: "User",
    email: "testuser@example.com",
    password: "password123",
  });
  await user.save();
  testUserId = user._id;

  token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "testsecret", {
    expiresIn: "1d",
  });

  const blog = new Blog({
    title: "Public Blog",
    description: "This blog is visible to all.",
    body: "Some public content.",
    tags: ["public", "test"],
    author: user._id,
  });

  await blog.save();
  blog.state = "published";
  await blog.save();
  blogId = blog._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Public Blog Routes", () => {
  it("should return all published blogs (unauthenticated)", async () => {
    const res = await request(app).get("/api/v1/blogs/published");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
    expect(res.body.blogs.length).toBeGreaterThan(0);
  });

  it("should return a specific published blog by ID (unauthenticated)", async () => {
    const res = await request(app).get(`/api/v1/blogs/published/${blogId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("state", "published");
    expect(res.body).toHaveProperty("_id", blogId.toString());
  });
});

describe("Authenticated Blog Routes", () => {
  it("should create a new blog (authenticated)", async () => {
    const res = await request(app)
      .post("/api/v1/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "New Blog",
        description: "Just testing create route",
        body: "Here is some content.",
        tags: ["create", "test"],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("title", "New Blog");
    expect(res.body).toHaveProperty("state", "draft");
  });

  it("should publish a blog (authenticated)", async () => {
    const blogRes = await request(app)
      .post("/api/v1/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Draft Blog",
        description: "About to publish",
        body: "Waiting to go public",
        tags: ["draft"],
      });

    const draftBlogId = blogRes.body._id;

    const res = await request(app)
      .patch(`/api/v1/blogs/${draftBlogId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("state", "published");
  });

  it("should return blogs created by the authenticated user", async () => {
    const res = await request(app)
      .get("/api/v1/blogs/my-blogs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
    expect(res.body.blogs.length).toBeGreaterThanOrEqual(1);
    res.body.blogs.forEach((blog) => {
      expect(blog.author).toBeDefined();
    });
  });

  it("should update a blog by the authenticated user", async () => {
    const res = await request(app)
      .put(`/api/v1/blogs/${blogId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Blog Title",
        body: "Updated blog body content",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("title", "Updated Blog Title");
    expect(res.body).toHaveProperty("body", "Updated blog body content");
  });

  it("should delete a blog (authenticated)", async () => {
    const blogRes = await request(app)
      .post("/api/v1/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Blog To Delete",
        description: "This one will be deleted",
        body: "Bye bye blog",
        tags: ["delete"],
      });

    const blogToDeleteId = blogRes.body._id;

    const res = await request(app)
      .delete(`/api/v1/blogs/${blogToDeleteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("should not allow a user to update another user’s blog", async () => {
    // Create a second user
    const otherUser = new User({
      first_name: "Another",
      last_name: "User",
      email: "another@example.com",
      password: "password456",
    });
    await otherUser.save();

    const otherToken = jwt.sign(
      { id: otherUser._id },
      process.env.JWT_SECRET || "testsecret",
      {
        expiresIn: "1d",
      }
    );

    const res = await request(app)
      .put(`/api/v1/blogs/${blogId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        title: "Malicious Update Attempt",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message", "Unauthorized");
  });

  it("should not allow unauthenticated users to access draft blogs", async () => {
    const draftBlog = new Blog({
      title: "Draft Only",
      description: "Not yet public",
      body: "Still in the works",
      tags: ["draft"],
      author: testUserId,
    });
    await draftBlog.save();

    const res = await request(app).get(
      `/api/v1/blogs/published/${draftBlog._id}`
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message", "Blog not found");
  });

  it("should return paginated blogs with correct limit", async () => {
  const res = await request(app).get("/api/v1/blogs/published?page=1&limit=2");

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.blogs)).toBe(true);
  expect(res.body.blogs.length).toBeLessThanOrEqual(2);
});

  it("should filter published blogs by title", async () => {
  const res = await request(app).get("/api/v1/blogs/published?title=Node");

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.blogs)).toBe(true);
  res.body.blogs.forEach(blog => {
    expect(blog.title.toLowerCase()).toContain("node");
  });
});

it("should filter published blogs by author name", async () => {
  const res = await request(app).get("/api/v1/blogs/published?author=Esther");

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.blogs)).toBe(true);
  res.body.blogs.forEach(blog => {
    expect(blog.author.name.toLowerCase()).toContain("esther");
  });
});

  it("should calculate reading time when a blog is created", async () => {
  const token = await loginAndGetToken(); // Mock or real login function

  const res = await request(app)
    .post("/api/v1/blogs")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Intro to Node.js",
      body: "Node.js is a JavaScript runtime built on Chrome’s V8 JavaScript engine...",
      tags: ["javascript", "backend"]
    });

  expect(res.statusCode).toBe(201);
  expect(res.body).toHaveProperty("reading_time");
  expect(res.body.reading_time).toMatch(/min read/);
});
});
