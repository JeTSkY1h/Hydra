import { useState } from 'react'
import { Box, Button, Field, Heading, Input, Text, Stack } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

export default function UnlockOverlay() {
  const { unlockVaultKey } = useAuth()
  const { loadAll } = useData()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUnlock() {
    setError('')
    setLoading(true)
    try {
      await unlockVaultKey(password)
      await loadAll()
    } catch {
      setError('Falsches Passwort')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Box bg="white" p={8} rounded="lg" shadow="md" w="full" maxW="380px">
        <Heading size="md" mb={2}>Sitzung entsperren</Heading>
        <Text fontSize="sm" color="gray.500" mb={6}>
          Gib dein Passwort ein um die Daten zu entschlüsseln.
        </Text>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>Passwort</Field.Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
          </Field.Root>
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button onClick={handleUnlock} loading={loading} width="full">
            Entsperren
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
