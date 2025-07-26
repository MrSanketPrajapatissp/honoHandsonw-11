import { Hono } from 'hono'
import { PrismaClient } from './generated/prisma/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import type { Context, Next } from 'hono'

// Define a type for Hono's environment variables
type Bindings = {
  DATABASE_URL: string
  JWT_SECRET: string // Example for a real-world auth token
}

const app = new Hono<{ Bindings: Bindings }>()

// --- Middleware ---
// Define middleware with proper types. Place it BEFORE the routes that need it.
async function authMiddleware(c: Context, next: Next) {
  // In a real app, you would verify a JWT token here.
  // This is a simplified check.
  if (c.req.header("Authorization")) {
    await next()
  } else {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

// --- Route Definitions ---

// PUBLIC ROUTE: POST /signup
// This route is for creating a new user. It does not need authentication.
app.post('/signup', async (c) => {
  // Initialize Prisma Client ONCE when your application starts.
  // Use Hono's `c.env` to securely access environment variables.
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
    const body = await c.req.json<{ name: string; email: string; password: string }>()

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password // Remember to hash passwords in a real app!
      },
      // Select only the fields you want to return
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return c.json({ message: 'User created successfully', user: user }, 201)
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Invalid request or user already exists' }, 400)
  }
})

// PROTECTED ROUTE: GET /me
// Apply the auth middleware only to this route.
// It retrieves user info and requires a valid Authorization header.
app.get('/me', authMiddleware, async (c) => {
  // Here you would typically decode a JWT from the Authorization header
  // to identify the user and fetch their specific data.
  const authHeader = c.req.header("Authorization")
  return c.json({
    message: "You are authorized!",
    authHeader: authHeader
  })
})

export default app