import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Field, Heading, Input, Stack, Text,
} from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { apiPost, apiGet } from '../lib/api'
import {
  initCrypto,
  deriveKeypair,
  decryptVaultKey,
} from '../lib/crypto'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      await initCrypto()

      // 1. kdfSalt holen um Keypair ableiten zu können
      const { kdfSalt } = await apiGet<{ kdfSalt: string }>(`/auth/preauth/${name}`)

      // 2. Keypair aus Passwort ableiten
      const keypair = deriveKeypair(password, kdfSalt)

      // 3. Login
      const { token, encryptedVaultKey, role, userId } = await apiPost<{
        token: string
        encryptedVaultKey: string
        kdfSalt: string
        role: 'ADMIN' | 'MEMBER'
        userId: string
      }>('/auth/login', { name, password })

      // 4. Vault Key entschlüsseln
      const vaultKey = decryptVaultKey(encryptedVaultKey, keypair.publicKey, keypair.privateKey)

      login(token, encryptedVaultKey, kdfSalt, vaultKey, role, userId, name)
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
        <Heading mb={6} size="lg" textAlign="center">Hydra</Heading>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>Benutzername</Field.Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Benutzername"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Passwort</Field.Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </Field.Root>
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button onClick={handleLogin} loading={loading} width="full">
            Anmelden
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
