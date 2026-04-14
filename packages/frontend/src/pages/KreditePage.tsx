import { useState, useMemo } from 'react'
import {
  Box, Button, Flex, Heading, Input, Text, HStack, VStack,
  Table, Badge, Spinner, Stack,
} from '@chakra-ui/react'
import type { Credit, Transaction } from '@hydra/shared'
import { useData } from '../context/DataContext'
import { FaTrash } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'

// ─── Hilfsfunktionen ───────────────────────────────────────────────────────────

function formatEur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function isAdmin() {
  const { role } = useAuth()
  return role === 'ADMIN'
}

// ─── Kredit-Karte ─────────────────────────────────────────────────────────────

function CreditCard({ credit, payments }: { credit: Credit; payments: Transaction[] }) {
  const { remove } = useData()

  const totalPaid = payments.reduce((s, p) => s + p.amountCents, 0)
  const remaining = credit.startAmountCents - totalPaid
  const pct = Math.min(100, Math.round((totalPaid / credit.startAmountCents) * 100))

  const sortedPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Box bg="white" rounded="lg" shadow="sm" p={5} mb={4} overflowX="auto">
      <Flex justify="space-between" align="start" mb={4}>
        <Box>
          <Heading size="sm">{credit.personName}</Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Startsumme: {formatEur(credit.startAmountCents)}
          </Text>
        </Box>
        {isAdmin() && (
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => remove('credit', credit.id)}>
            <FaTrash/>
          </Button>
        )}
      </Flex>

      {/* Fortschrittsbalken */}
      <Box bg="gray.100" rounded="full" h="8px" mb={3}>
        <Box
          bg={pct === 100 ? 'green.400' : 'blue.400'}
          rounded="full"
          h="8px"
          w={`${pct}%`}
          transition="width 0.3s"
        />
      </Box>

      <HStack gap={6} mb={4}>
        <VStack align="start" gap={0}>
          <Text fontSize="xs" color="gray.500">Gezahlt</Text>
          <Text fontWeight="bold" color="green.600">{formatEur(totalPaid)}</Text>
        </VStack>
        <VStack align="start" gap={0}>
          <Text fontSize="xs" color="gray.500">Noch offen</Text>
          <Text fontWeight="bold" color={remaining <= 0 ? 'green.600' : 'red.600'}>
            {remaining <= 0 ? 'Abgezahlt ✓' : formatEur(remaining)}
          </Text>
        </VStack>
        <VStack align="start" gap={0}>
          <Text fontSize="xs" color="gray.500">Fortschritt</Text>
          <Badge colorPalette={pct === 100 ? 'green' : 'blue'}>{pct}%</Badge>
        </VStack>
      </HStack>

      {/* Zahlungsverlauf */}
      {sortedPayments.length > 0 && (
        <Box>
          <Text fontSize="xs" color="gray.500" mb={2}>Zahlungsverlauf</Text>
          <Table.Root size="sm">
            <Table.Body>
              {sortedPayments.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell fontSize="sm" color="gray.500">{p.date}</Table.Cell>
                  <Table.Cell fontSize="sm">{p.description}</Table.Cell>
                  <Table.Cell fontSize="sm" fontWeight="medium">{formatEur(p.amountCents)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

// ─── Neuen Kredit anlegen ─────────────────────────────────────────────────────

function AddCreditForm({ onDone }: { onDone: () => void }) {
  const { create } = useData()
  const [personName, setPersonName] = useState('')
  const [startAmount, setStartAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!personName.trim() || !startAmount) return
    setLoading(true)
    try {
      await create<Credit>('credit', {
        personName: personName.trim(),
        startAmountCents: Math.round(parseFloat(startAmount.replace(',', '.')) * 100),
      })
      setPersonName('')
      setStartAmount('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack>
      <Input
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        placeholder="Name"
        size="sm"
      />
      <Input
        value={startAmount}
        onChange={(e) => setStartAmount(e.target.value)}
        placeholder="Betrag €"
        size="sm"
        w="120px"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button size="sm" onClick={submit} loading={loading}>Hinzufügen</Button>
    </HStack>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function KreditePage() {
  const { data, loading } = useData()
  const [showAdd, setShowAdd] = useState(false)

  // Zahlungen aus Transaktionen ableiten — Transaktionen mit creditId
  const paymentsByCredit = useMemo(() => {
    const map: Record<string, Transaction[]> = {}
    for (const tx of data.transactions) {
      if (tx.creditId) {
        if (!map[tx.creditId]) map[tx.creditId] = []
        map[tx.creditId].push(tx)
      }
    }
    return map
  }, [data.transactions])

  const totalOpen = data.credits.reduce((sum, credit) => {
    const paid = (paymentsByCredit[credit.id] ?? []).reduce((s, p) => s + p.amountCents, 0)
    return sum + Math.max(0, credit.startAmountCents - paid)
  }, 0)

  if (loading) return <Spinner />

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading>Kredite</Heading>
          {data.credits.length > 0 && (
            <Text fontSize="sm" color="gray.500" mt={1}>
              Gesamt noch offen: {formatEur(totalOpen)}
            </Text>
          )}
        </Box>
        {isAdmin()&&(<Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Abbrechen' : '+ Kredit'}
        </Button>)}
      </Flex>

      {showAdd && (
        <Box bg="white" p={4} rounded="lg" shadow="sm" mb={4}>
          <AddCreditForm onDone={() => setShowAdd(false)} />
        </Box>
      )}

      {data.credits.length === 0 && !showAdd && (
        <Text color="gray.500">Noch keine Kredite erfasst.</Text>
      )}

      {data.credits.map((credit) => (
        <CreditCard
          key={credit.id}
          credit={credit}
          payments={paymentsByCredit[credit.id] ?? []}
        />
      ))}
    </Box>
  )
}
