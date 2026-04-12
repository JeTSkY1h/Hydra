import { Hono } from 'hono'
import { db } from './db.js'
import type { AppVariables } from './types.js'
import { requireAuth } from './auth.js'

export const inviteRouter = new Hono<{ Variables: AppVariables }>()

// POST /api/invites — Invite erstellen (nur eingeloggte User)
inviteRouter.post('/', requireAuth, async (c) => {
  const { token, encryptedVaultKey } = await c.req.json()

  if (!token || !encryptedVaultKey) {
    return c.json({ error: 'token und encryptedVaultKey fehlen' }, 400)
  }

  // Token muss 64 hex-Zeichen sein (32 Bytes)
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return c.json({ error: 'Ungültiges Token-Format' }, 400)
  }

  // Invite läuft in 7 Tagen ab
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await db.invite.create({
    data: {
      token,
      encryptedVaultKey,
      createdById: c.get('userId'),
      expiresAt,
    },
  })

  return c.json({ token: invite.token, expiresAt: invite.expiresAt })
})

// GET /api/invites/:token — Invite-Daten abrufen (öffentlich, kein Login nötig)
inviteRouter.get('/:token', async (c) => {
  const token = c.req.param('token')

  const invite = await db.invite.findUnique({ where: { token } })

  if (!invite) {
    return c.json({ error: 'Invite nicht gefunden' }, 404)
  }

  if (invite.usedAt) {
    return c.json({ error: 'Invite wurde bereits verwendet' }, 410)
  }

  if (invite.expiresAt < new Date()) {
    return c.json({ error: 'Invite ist abgelaufen' }, 410)
  }

  return c.json({ encryptedVaultKey: invite.encryptedVaultKey })
})
