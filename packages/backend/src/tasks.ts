import { Hono } from 'hono'
import { db } from './db.js'
import type { AppVariables } from './types.js'
import { requireAuth } from './auth.js'

export const tasksRouter = new Hono<{ Variables: AppVariables }>()

// GET /api/tasks — alle Tasks laden (alle eingeloggten User)
tasksRouter.get('/', requireAuth, async (c) => {
  const tasks = await db.task.findMany({ orderBy: { createdAt: 'asc' } })
  return c.json(tasks)
})

// POST /api/tasks — neuen Task erstellen (alle eingeloggten User)
tasksRouter.post('/', requireAuth, async (c) => {
  const { encryptedData } = await c.req.json()
  if (!encryptedData) return c.json({ error: 'encryptedData fehlt' }, 400)

  const task = await db.task.create({ data: { encryptedData } })
  return c.json(task, 201)
})

// PUT /api/tasks/:id — Task aktualisieren (alle eingeloggten User)
tasksRouter.put('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const { encryptedData } = await c.req.json()
  if (!encryptedData) return c.json({ error: 'encryptedData fehlt' }, 400)

  const task = await db.task.update({ where: { id }, data: { encryptedData } })
  return c.json(task)
})

// DELETE /api/tasks/:id — Task löschen (alle eingeloggten User)
tasksRouter.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await db.task.delete({ where: { id } })
  return c.json({ ok: true })
})
