import { useEffect, useState } from 'react'
import {
  Box, Button, Heading, HStack, Stack, Text, Badge, Separator,
  ClipboardRoot, ClipboardInput, ClipboardTrigger, ClipboardIndicator,
  Input, Field,
} from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost, apiDelete, apiPatch } from '../lib/api'
import { encryptVaultKeyForInvite } from '../lib/crypto'

type User = {
  id: string
  name: string
  role: 'ADMIN' | 'MEMBER'
  createdAt: string
}

export default function EinstellungenPage() {
  const { token, role, userId, vaultKey } = useAuth()
  const isAdmin = role === 'ADMIN'

  const [users, setUsers] = useState<User[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const [changePasswordOld, setChangePasswordOld] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)

  useEffect(() => {
    if (isAdmin && token) {
      apiGet<User[]>('/users', token).then(setUsers).catch(() => {})
    }
  }, [isAdmin, token])

  async function handleCreateInvite() {
    if (!vaultKey || !token) return
    setInviteError('')
    setInviteLink('')
    setInviteLoading(true)
    try {
      // Zufälliges 32-Byte Token als hex
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
      const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const encryptedVaultKey = encryptVaultKeyForInvite(vaultKey, inviteToken)

      await apiPost('/invites', { token: inviteToken, encryptedVaultKey }, token)

      const link = `${window.location.origin}/register?invite=${inviteToken}`
      setInviteLink(link)
    } catch (e: any) {
      setInviteError(e.message)
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleDeleteUser(targetId: string) {
    if (!token) return
    try {
      await apiDelete(`/users/${targetId}`, token)
      setUsers(prev => prev.filter(u => u.id !== targetId))
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleToggleRole(target: User) {
    if (!token) return
    const newRole = target.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    try {
      const updated = await apiPatch<User>(`/users/${target.id}/role`, { role: newRole }, token)
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u))
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleChangePassword() {
    if (!token) return
    setChangePasswordError('')
    setChangePasswordSuccess(false)
    if (changePasswordNew.length < 12) {
      setChangePasswordError('Neues Passwort muss mindestens 12 Zeichen lang sein')
      return
    }
    setChangePasswordLoading(true)
    try {
      await apiPost('/auth/change-password', {
        oldPassword: changePasswordOld,
        newPassword: changePasswordNew,
      }, token)
      setChangePasswordOld('')
      setChangePasswordNew('')
      setChangePasswordSuccess(true)
    } catch (e: any) {
      setChangePasswordError(e.message)
    } finally {
      setChangePasswordLoading(false)
    }
  }

  return (
    <Box maxW="600px">
      <Heading mb={6}>Einstellungen</Heading>

      {/* ─── Nutzerverwaltung (nur Admin) ─────────────────────────── */}
      {isAdmin && (
        <>
          <Heading size="md" mb={3}>Nutzer</Heading>
          <Stack gap={2} mb={4}>
            {users.map(u => (
              <HStack key={u.id} justify="space-between" p={3} bg="white" rounded="md" shadow="xs">
                <HStack gap={3}>
                  <Text fontWeight="medium">{u.name}</Text>
                  <Badge colorPalette={u.role === 'ADMIN' ? 'purple' : 'gray'} size="sm">
                    {u.role}
                  </Badge>
                </HStack>
                {u.id !== userId && (
                  <HStack gap={2}>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleToggleRole(u)}
                    >
                      {u.role === 'ADMIN' ? 'zu Member' : 'zu Admin'}
                    </Button>
                    <Button
                      size="xs"
                      colorPalette="red"
                      variant="outline"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Löschen
                    </Button>
                  </HStack>
                )}
              </HStack>
            ))}
          </Stack>

          <Separator mb={4} />

          {/* ─── Invite erstellen ────────────────────────────────────── */}
          <Heading size="md" mb={3}>Einladungslink erstellen</Heading>
          <Stack gap={3} mb={6}>
            <Text fontSize="sm" color="gray.600">
              Der Link ist 7 Tage gültig und kann nur einmal verwendet werden.
              Der neue Nutzer erhält automatisch Zugriff auf alle verschlüsselten Daten.
            </Text>
            <Button onClick={handleCreateInvite} loading={inviteLoading} w="fit-content">
              Neuen Invite generieren
            </Button>
            {inviteError && <Text color="red.500" fontSize="sm">{inviteError}</Text>}
            {inviteLink && (
              <ClipboardRoot value={inviteLink}>
                <HStack>
                  <ClipboardInput asChild>
                    <Input value={inviteLink} readOnly fontSize="xs" />
                  </ClipboardInput>
                  <ClipboardTrigger asChild>
                    <Button size="sm" variant="outline">
                      <ClipboardIndicator copied="Kopiert!" />
                    </Button>
                  </ClipboardTrigger>
                </HStack>
              </ClipboardRoot>
            )}
          </Stack>

          <Separator mb={4} />
        </>
      )}

      {/* ─── Passwort ändern ──────────────────────────────────────── */}
      <Heading size="md" mb={3}>Passwort ändern</Heading>
      <Stack gap={3} maxW="360px">
        <Field.Root>
          <Field.Label>Aktuelles Passwort</Field.Label>
          <Input
            type="password"
            value={changePasswordOld}
            onChange={e => setChangePasswordOld(e.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Neues Passwort</Field.Label>
          <Input
            type="password"
            value={changePasswordNew}
            onChange={e => setChangePasswordNew(e.target.value)}
            placeholder="Mindestens 12 Zeichen"
          />
        </Field.Root>
        {changePasswordError && <Text color="red.500" fontSize="sm">{changePasswordError}</Text>}
        {changePasswordSuccess && <Text color="green.500" fontSize="sm">Passwort erfolgreich geändert.</Text>}
        <Button onClick={handleChangePassword} loading={changePasswordLoading} w="fit-content">
          Passwort ändern
        </Button>
      </Stack>
    </Box>
  )
}
