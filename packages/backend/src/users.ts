import { Hono } from 'hono'
import { db } from './db.js'
import type { AppVariables } from './types.js'
import { requireAuth, requireAdmin } from './auth.js'

export const usersRouter = new Hono<{ Variables: AppVariables }>()

// GET /api/users — Liste aller User (nur Admin)
usersRouter.get('/', requireAuth, requireAdmin, async (c) => {
  const users = await db.user.findMany({
    select: { id: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(users)
})

// DELETE /api/users/:id — User löschen (nur Admin, nicht sich selbst)
usersRouter.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const targetId = c.req.param('id')
  const selfId = c.get('userId')

  if (targetId === selfId) {
    return c.json({ error: 'Du kannst dich nicht selbst löschen' }, 400)
  }

  const target = await db.user.findUnique({ where: { id: targetId } })
  if (!target) {
    return c.json({ error: 'User nicht gefunden' }, 404)
  }

  await db.user.delete({ where: { id: targetId } })
  return c.json({ ok: true })
})

// PATCH /api/users/:id/role — Rolle ändern (nur Admin, nicht die eigene)
usersRouter.patch('/:id/role', requireAuth, requireAdmin, async (c) => {
  const targetId = c.req.param('id')
  const selfId = c.get('userId')
  const { role } = await c.req.json()

  if (targetId === selfId) {
    return c.json({ error: 'Du kannst deine eigene Rolle nicht ändern' }, 400)
  }

  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return c.json({ error: 'Ungültige Rolle' }, 400)
  }

  const target = await db.user.findUnique({ where: { id: targetId } })
  if (!target) {
    return c.json({ error: 'User nicht gefunden' }, 404)
  }

  const updated = await db.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, name: true, role: true },
  })

  return c.json(updated)
})
