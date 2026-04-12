import { useState } from 'react'
import {
  Box, Button, Heading, Text, Input, Stack, Field,
} from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../lib/api'
import { encryptVaultKeyForInvite } from '../lib/crypto'

export default function DashboardPage() {
  const { logout, token, vaultKey } = useAuth()
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createInvite() {
    if (!vaultKey || !token) return
    setError('')
    setLoading(true)
    try {
      // 1. Zufälliges Token generieren (im Browser)
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
      const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // 2. Vault Key mit dem Invite-Token verschlüsseln
      const encryptedVaultKey = encryptVaultKeyForInvite(vaultKey, inviteToken)

      // 3. Token + verschlüsselten Vault Key auf Server speichern
      await apiPost('/invites', { token: inviteToken, encryptedVaultKey }, token)

      // 4. Invite-Link zusammenbauen
      setInviteLink(`${window.location.origin}/register?invite=${inviteToken}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={8} maxW="600px" mx="auto">
      <Heading mb={2}>Hydra</Heading>
      <Text color="gray.500" mb={8}>Dashboard</Text>

      <Stack gap={4}>
        <Heading size="sm">Neuen User einladen</Heading>
        {!vaultKey && (
          <Text color="orange.500" fontSize="sm">
            Vault Key nicht im Memory — bitte neu einloggen um Invites zu erstellen.
          </Text>
        )}
        <Button
          onClick={createInvite}
          loading={loading}
          disabled={!vaultKey}
          alignSelf="start"
        >
          Invite-Link erstellen
        </Button>
        {error && <Text color="red.500" fontSize="sm">{error}</Text>}
        {inviteLink && (
          <Field.Root>
            <Field.Label fontSize="sm">Invite-Link (einmalig, 7 Tage gültig)</Field.Label>
            <Input value={inviteLink} readOnly onFocus={e => e.target.select()} />
            <Field.HelperText>
              Teile diesen Link nur mit der Person die du einladen willst.
            </Field.HelperText>
          </Field.Root>
        )}
      </Stack>

      <Button variant="outline" onClick={logout} mt={12}>
        Abmelden
      </Button>
    </Box>
  )
}
