import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { authRouter, requireAuth } from './auth.js'
import { inviteRouter } from './invites.js'
import { dataRouter } from './data.js'
import { usersRouter } from './users.js'
import { tasksRouter } from './tasks.js'
import { db } from './db.js'
import type { AppVariables } from './types.js'

const app = new Hono<{ Variables: AppVariables }>()

// ─── CSP + Security Headers ───────────────────────────────────────────────────
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'")
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('Referrer-Policy', 'no-referrer')
})

// ─── Rate Limiter: max 10 Login-Versuche pro 5 Minuten pro IP ─────────────────
const loginLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
})

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/auth/login', loginLimiter)
app.route('/api/auth', authRouter)
app.route('/api/invites', inviteRouter)
app.route('/api/data', dataRouter)
app.route('/api/users', usersRouter)
app.route('/api/tasks', tasksRouter)

// Beispiel einer geschützten Route
app.get('/api/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const user = await db.user.findUnique({ where: { id: userId } })
  return c.json({ id: user!.id, name: user!.name })
})

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('Backend läuft auf http://localhost:3000')
})
