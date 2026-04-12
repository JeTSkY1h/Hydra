import { useState } from 'react'
import {
  Box, Button, Flex, Heading, Input, Text, HStack, Table, Spinner,
} from '@chakra-ui/react'
import type { Asset } from '@hydra/shared'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { FaTrash } from 'react-icons/fa6'


// ─── Hilfsfunktionen ───────────────────────────────────────────────────────────
function formatEur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function parseEur(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100) || 0
}

function isAdmin() {
  const { role } = useAuth()
  return role === 'ADMIN'
}

// ─── Vermögenswert hinzufügen ─────────────────────────────────────────────────
function AddAssetForm({ onDone }: { onDone: () => void }) {
  const { create } = useData()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!name.trim() || !value) return
    setLoading(true)
    try {
      await create<Asset>('asset', {
        name: name.trim(),
        valueCents: parseEur(value),
      })
      setName('')
      setValue('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bezeichnung" size="sm" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Wert €" size="sm" w="130px" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <Button size="sm" onClick={submit} loading={loading}>Hinzufügen</Button>
    </HStack>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────
export default function VermoegenPage() {
  const { data, loading, update, remove } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const total = data.assets.reduce((s, a) => s + a.valueCents, 0)

  async function saveEdit(asset: Asset) {
    await update<Asset>('asset', { ...asset, valueCents: parseEur(editValue) })
    setEditingId(null)
  }

  if (loading) return <Spinner />

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading>Vermögen</Heading>
          {data.assets.length > 0 && (
            <Text fontSize="sm" color="gray.500" mt={1}>Gesamt: {formatEur(total)}</Text>
          )}
        </Box>
        {isAdmin() && (
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Abbrechen' : '+ Hinzufügen'}
          </Button>
        )}
      </Flex>

      {showAdd && (
        <Box bg="white" p={4} rounded="lg" shadow="sm" mb={4}>
          <AddAssetForm onDone={() => setShowAdd(false)} />
        </Box>
      )}

      {data.assets.length === 0 && !showAdd && (
        <Text color="gray.500">Noch keine Vermögenswerte erfasst.</Text>
      )}

      {data.assets.length > 0 && (
        <Box bg="white" rounded="lg" shadow="sm" overflowX="auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Bezeichnung</Table.ColumnHeader>
                <Table.ColumnHeader>Wert</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.assets.map((asset) => (
                <Table.Row key={asset.id}>
                  <Table.Cell>{asset.name}</Table.Cell>
                  <Table.Cell>
                    {editingId === asset.id ? (
                      <HStack>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          size="xs"
                          w="120px"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(asset)}
                        />
                        <Button size="xs" onClick={() => saveEdit(asset)}>OK</Button>
                        <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>×</Button>
                      </HStack>
                    ) : (
                      <Text
                        cursor="pointer"
                        onClick={() => { setEditingId(asset.id); setEditValue((asset.valueCents / 100).toFixed(2)) }}
                      >
                        {formatEur(asset.valueCents)} ✎
                      </Text>
                    )}
                  </Table.Cell>
                  {isAdmin() && (
                    <Table.Cell>
                      <Button size="xs" variant="ghost" colorPalette="red" onClick={() => remove('asset', asset.id)}>
                        <FaTrash />
                      </Button>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}
