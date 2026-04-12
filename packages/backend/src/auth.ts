import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import * as argon2 from 'argon2'
import { db } from './db.js'
import type { AppVariables } from './types.js'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET ist nicht gesetzt')
  return new TextEncoder().encode(secret)
}

export const authRouter = new Hono()

// GET /api/auth/preauth/:name
// Gibt kdfSalt zurück — wird vor dem Login gebraucht damit das
// Frontend das Keypair aus dem Passwort ableiten kann.
// Keine Authentifizierung nötig, kdfSalt ist nicht geheim.
authRouter.get('/preauth/:name', async (c) => {
  const name = c.req.param('name')
  const user = await db.user.findUnique({ where: { name } })

  // Gleiche Antwort ob User existiert oder nicht —
  // verhindert dass ein Angreifer gültige Usernamen erraten kann
  if (!user) {
    return c.json({ error: 'Ungültige Anmeldedaten' }, 401)
  }

  return c.json({ kdfSalt: user.kdfSalt })
})

// POST /api/auth/register
// Erwartet: name, password, kdfSalt, publicKey, encryptedVaultKey, inviteToken
// encryptedVaultKey = Vault Key verschlüsselt mit dem Public Key des neuen Users
// inviteToken = wird nach erfolgreicher Registrierung als "benutzt" markiert
authRouter.post('/register', async (c) => {
  const { name, password, kdfSalt, publicKey, encryptedVaultKey, inviteToken } = await c.req.json()

  if (!name || !password || !kdfSalt || !publicKey || !encryptedVaultKey) {
    return c.json({ error: 'Fehlende Felder' }, 400)
  }

  if (password.length < 12) {
    return c.json({ error: 'Passwort muss mindestens 12 Zeichen lang sein' }, 400)
  }

  // Wenn noch kein User existiert → erster User darf sich ohne Invite registrieren
  const userCount = await db.user.count()
  const isFirstUser = userCount === 0

  // Invite prüfen — außer beim ersten User
  let invite = null
  if (!isFirstUser) {
    if (!inviteToken) {
      return c.json({ error: 'Invite erforderlich' }, 400)
    }
    invite = await db.invite.findUnique({ where: { token: inviteToken } })
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return c.json({ error: 'Ungültiger oder abgelaufener Invite' }, 400)
    }
  }

  const existing = await db.user.findUnique({ where: { name } })
  if (existing) {
    return c.json({ error: 'Name bereits vergeben' }, 409)
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, passwordHash, kdfSalt, publicKey, encryptedVaultKey, role: isFirstUser ? 'ADMIN' : 'MEMBER' },
    })
    if (invite) {
      await tx.invite.update({
        where: { token: inviteToken },
        data: { usedAt: new Date() },
      })
    }
    return newUser
  })

  return c.json({ id: user.id, name: user.name }, 201)
})

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  const { name, password } = await c.req.json()

  if (!name || !password) {
    return c.json({ error: 'Name und Passwort erforderlich' }, 400)
  }

  const user = await db.user.findUnique({ where: { name } })

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return c.json({ error: 'Ungültige Anmeldedaten' }, 401)
  }

  const token = await new SignJWT({ sub: user.id, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getJwtSecret())

  // encryptedVaultKey und kdfSalt zurückgeben damit das Frontend
  // den Vault Key entschlüsseln kann
  return c.json({
    token,
    encryptedVaultKey: user.encryptedVaultKey,
    kdfSalt: user.kdfSalt,
    role: user.role,
    userId: user.id,
  })
})

// POST /api/auth/change-password
// Das Frontend leitet aus dem neuen Passwort ein neues Keypair ab,
// verschlüsselt den Vault Key damit neu und schickt alles zusammen.
authRouter.post('/change-password', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Nicht authentifiziert' }, 401)
  }
  const jwtToken = authHeader.slice(7)
  let userId: string
  try {
    const { payload } = await jwtVerify(jwtToken, getJwtSecret())
    if (!payload.sub) return c.json({ error: 'Token ungültig' }, 401)
    userId = payload.sub
  } catch {
    return c.json({ error: 'Token ungültig oder abgelaufen' }, 401)
  }

  const { oldPassword, newPassword, newKdfSalt, newPublicKey, newEncryptedVaultKey } = await c.req.json()

  if (!oldPassword || !newPassword || !newKdfSalt || !newPublicKey || !newEncryptedVaultKey) {
    return c.json({ error: 'Fehlende Felder' }, 400)
  }

  if (newPassword.length < 12) {
    return c.json({ error: 'Passwort muss mindestens 12 Zeichen lang sein' }, 400)
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !(await argon2.verify(user.passwordHash, oldPassword))) {
    return c.json({ error: 'Aktuelles Passwort falsch' }, 400)
  }

  const newPasswordHash = await argon2.hash(newPassword, { type: argon2.argon2id })

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      kdfSalt: newKdfSalt,
      publicKey: newPublicKey,
      encryptedVaultKey: newEncryptedVaultKey,
    },
  })

  return c.json({ ok: true })
})

// Middleware: prüft ob ein gültiges JWT im Authorization-Header ist
export async function requireAuth(c: Context<{ Variables: AppVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Nicht authentifiziert' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (!payload.sub || typeof payload.name !== 'string') {
      return c.json({ error: 'Token ungültig' }, 401)
    }
    c.set('userId', payload.sub)
    c.set('userName', payload.name)
    await next()
  } catch {
    return c.json({ error: 'Token ungültig oder abgelaufen' }, 401)
  }
}

// Middleware: prüft ob der eingeloggte User Admin ist (setzt requireAuth voraus)
export async function requireAdmin(c: Context<{ Variables: AppVariables }>, next: Next) {
  const userId = c.get('userId')
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'ADMIN') {
    return c.json({ error: 'Nur Admins dürfen das' }, 403)
  }
  await next()
}
