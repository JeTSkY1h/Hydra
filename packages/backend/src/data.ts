import { Hono } from 'hono'
import { db } from './db.js'
import { requireAuth, requireAdmin } from './auth.js'
import type { AppVariables } from './types.js'

export const dataRouter = new Hono<{ Variables: AppVariables }>()

// Alle erlaubten Tabellen — verhindert dass ein Angreifer beliebige DB-Tabellen anspricht
const ALLOWED_TABLES = [
  'category',
  'product',
  'transaction',
  'monthlyCash',
  'asset',
  'credit',
  'creditPayment',
  'appSettings',
] as const

type Table = (typeof ALLOWED_TABLES)[number]

function isAllowed(table: string): table is Table {
  return ALLOWED_TABLES.includes(table as Table)
}

// Alle Einträge einer Tabelle laden
dataRouter.get('/:table', requireAuth, async (c) => {
  const table = c.req.param('table') ?? ''
  if (!isAllowed(table)) return c.json({ error: 'Unbekannte Tabelle' }, 400)

  const records = await (db[table] as any).findMany({
    orderBy: { createdAt: 'asc' },
  })
  return c.json(records)
})

// Neuen Eintrag erstellen — nur Admins
dataRouter.post('/:table', requireAuth, requireAdmin, async (c) => {
  const table = c.req.param('table') ?? ''
  if (!isAllowed(table)) return c.json({ error: 'Unbekannte Tabelle' }, 400)

  const { encryptedData } = await c.req.json()
  if (!encryptedData) return c.json({ error: 'encryptedData fehlt' }, 400)

  const record = await (db[table] as any).create({
    data: { encryptedData },
  })
  return c.json(record, 201)
})

// Eintrag aktualisieren — nur Admins
dataRouter.put('/:table/:id', requireAuth, requireAdmin, async (c) => {
  const table = c.req.param('table') ?? ''
  const id = c.req.param('id') ?? ''
  if (!isAllowed(table)) return c.json({ error: 'Unbekannte Tabelle' }, 400)

  const { encryptedData } = await c.req.json()
  if (!encryptedData) return c.json({ error: 'encryptedData fehlt' }, 400)

  const record = await (db[table] as any).update({
    where: { id },
    data: { encryptedData },
  })
  return c.json(record)
})

// Eintrag löschen — nur Admins
dataRouter.delete('/:table/:id', requireAuth, requireAdmin, async (c) => {
  const table = c.req.param('table') ?? ''
  const id = c.req.param('id') ?? ''
  if (!isAllowed(table)) return c.json({ error: 'Unbekannte Tabelle' }, 400)

  await (db[table] as any).delete({ where: { id } })
  return c.json({ ok: true })
})
