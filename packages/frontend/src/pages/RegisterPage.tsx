import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Button, Field, Heading, Input, Stack, Text,
} from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { apiPost, apiGet } from '../lib/api'
import {
  initCrypto,
  generateKdfSalt,
  generateVaultKey,
  deriveKeypair,
  encryptVaultKey,
  decryptVaultKeyFromInvite,
  toBase64,
} from '../lib/crypto'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setError('')
    setLoading(true)
    try {
      await initCrypto()

      const kdfSalt = generateKdfSalt()
      const keypair = deriveKeypair(password, kdfSalt)

      let vaultKey: Uint8Array

      if (inviteToken) {
        // Invite-Flow: Vault Key aus Invite entschlüsseln
        const { encryptedVaultKey: evkFromInvite } = await apiGet<{ encryptedVaultKey: string }>(
          `/invites/${inviteToken}`
        )
        vaultKey = decryptVaultKeyFromInvite(evkFromInvite, inviteToken)
      } else {
        // Erster User: neuen Vault Key generieren
        vaultKey = generateVaultKey()
      }

      const encryptedVaultKey = encryptVaultKey(vaultKey, keypair.publicKey)

      await apiPost('/auth/register', {
        name,
        password,
        kdfSalt,
        publicKey: toBase64(keypair.publicKey),
        encryptedVaultKey,
        ...(inviteToken ? { inviteToken } : {}),
      })

      const { token, encryptedVaultKey: evk, kdfSalt: salt, role, userId } = await apiPost<{
        token: string
        encryptedVaultKey: string
        kdfSalt: string
        role: 'ADMIN' | 'MEMBER'
        userId: string
      }>('/auth/login', { name, password })

      login(token, evk, salt, vaultKey, role, userId)
      navigate('/')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Box bg="white" p={8} rounded="lg" shadow="md" w="full" maxW="400px">
        <Heading mb={2} size="lg" textAlign="center">Hydra</Heading>
        <Text color="gray.500" mb={6} textAlign="center" fontSize="sm">
          {inviteToken
            ? 'Du wurdest eingeladen. Wähle einen Benutzernamen und ein Passwort.'
            : 'Erster Start. Lege den Admin-Account an.'}
        </Text>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>Benutzername</Field.Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. adler42"
            />
            <Field.HelperText>Wähle einen Namen ohne Rückschluss auf deine Person.</Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>Passwort</Field.Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 12 Zeichen"
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />
          </Field.Root>
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button onClick={handleRegister} loading={loading} width="full">
            Registrieren
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
