import { useState } from 'react'
import {
  Box, Button, Flex, Heading, Input, Text, HStack, Table, Spinner,
} from '@chakra-ui/react'
import type { Asset } from '@hydra/shared'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FaTrash } from 'react-icons/fa6'

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

function AddAssetForm({ onDone }: { onDone: () => void }) {
  const { create } = useData()
  const { isDark } = useTheme()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!name.trim() || !value) return
    setLoading(true)
    try {
      await create<Asset>('asset', { name: name.trim(), valueCents: parseEur(value) })
      setName('')
      setValue('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  const inputProps = {
    bg: isDark ? 'gray.700' : 'white',
    color: isDark ? 'gray.300' : 'gray.800',
    borderColor: isDark ? 'gray.600' : 'gray.200',
    _placeholder: { color: isDark ? 'gray.400' : 'gray.400' },
  }

  const btnProps = {
    variant: 'ghost' as const,
    bg: isDark ? 'gray.600' : 'gray.100',
    _hover: { bg: isDark ? 'gray.500' : 'gray.200' },
    color: isDark ? 'gray.200' : 'gray.700',
  }

  return (
    <HStack>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bezeichnung" size="sm" {...inputProps} />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Wert €" size="sm" w="130px" onKeyDown={(e) => e.key === 'Enter' && submit()} {...inputProps} />
      <Button size="sm" onClick={submit} loading={loading} {...btnProps}>Hinzufügen</Button>
    </HStack>
  )
}

export default function VermoegenPage() {
  const { data, loading, update, remove } = useData()
  const { isDark } = useTheme()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const total = data.assets.reduce((s, a) => s + a.valueCents, 0)

  async function saveEdit(asset: Asset) {
    await update<Asset>('asset', { ...asset, valueCents: parseEur(editValue) })
    setEditingId(null)
  }

  const btnProps = {
    variant: 'ghost' as const,
    bg: isDark ? 'gray.600' : 'gray.100',
    _hover: { bg: isDark ? 'gray.500' : 'gray.200' },
    color: isDark ? 'gray.200' : 'gray.700',
  }

  const inputProps = {
    bg: isDark ? 'gray.700' : 'white',
    color: isDark ? 'gray.300' : 'gray.800',
    borderColor: isDark ? 'gray.600' : 'gray.200',
  }

  if (loading) return <Spinner />

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box> 
          <Heading color={isDark ? "white" : "gray.900"}>Vermögen</Heading>
          {data.assets.length > 0 && (
            <Text fontSize="sm" color={isDark ? 'gray.400' : 'gray.500'} mt={1}>Gesamt: {formatEur(total)}</Text>
          )}
        </Box>
        {isAdmin() && (
          <Button size="sm" onClick={() => setShowAdd((v) => !v)} {...btnProps}>
            {showAdd ? 'Abbrechen' : '+ Hinzufügen'}
          </Button>
        )}
      </Flex>

      {showAdd && (
        <Box bg={isDark ? 'gray.700' : 'white'} p={4} rounded="lg" shadow="sm" mb={4}>
          <AddAssetForm onDone={() => setShowAdd(false)} />
        </Box>
      )}

      {data.assets.length === 0 && !showAdd && (
        <Text color={isDark ? 'gray.400' : 'gray.500'}>Noch keine Vermögenswerte erfasst.</Text>
      )}

      {data.assets.length > 0 && (
        <Box bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" overflowX="auto">
          <Table.Root color={isDark ? 'gray.300' : 'gray.700'} css={{ '--chakra-colors-bg': 'transparent' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader color={isDark ? "white" : "gray.900"}>Bezeichnung</Table.ColumnHeader>
                <Table.ColumnHeader color={isDark ? "white" : "gray.900"}>Wert</Table.ColumnHeader>
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
                          {...inputProps}
                        />
                        <Button size="xs" onClick={() => saveEdit(asset)} {...btnProps}>OK</Button>
                        <Button size="xs" onClick={() => setEditingId(null)} {...btnProps}>×</Button>
                      </HStack>
                    ) : (
                      <Text cursor="pointer" onClick={() => { setEditingId(asset.id); setEditValue((asset.valueCents / 100).toFixed(2)) }}>
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
