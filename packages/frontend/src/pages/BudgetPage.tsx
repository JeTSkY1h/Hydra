import { useState, useMemo } from 'react'
import {
  Box, Button, Flex, Heading, Input, Text, HStack, VStack,
  Table, Spinner, Badge,
} from '@chakra-ui/react'
import type { Transaction, MonthlyCash, Product, Credit } from '@hydra/shared'
import { useData } from '../context/DataContext'
import ProductAutocomplete from '../components/ProductAutocomplete'
import { useAuth } from '../context/AuthContext'
import { FaTrash } from 'react-icons/fa'

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function isAdmin() {
  const { role } = useAuth()
  return role === 'ADMIN'
}

function formatEur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function parseEur(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100) || 0
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Formular zum Hinzufügen einer Transaktion ────────────────────────────────

function AddTransactionForm({
  type,
  month,
  year,
  products,
  credits,
  onAdd,
}: {
  type: 'INCOME' | 'EXPENSE'
  month: number
  year: number
  products: Product[]
  credits: Credit[]
  onAdd: () => void
}) {
  const { create, update, data } = useData()
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [amount, setAmount] = useState('')
  const [productId, setProductId] = useState('')
  const [creditId, setCreditId] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!description.trim() || !amount) return
    setLoading(true)
    try {
      const amountCents = parseEur(amount)
      const qty = parseInt(quantity) || 1

      await create<Transaction>('transaction', {
        date,
        type,
        description: description.trim(),
        quantity: type === 'INCOME' ? qty : undefined,
        amountCents,
        productId: productId || undefined,
        creditId: creditId || undefined,
      })

      // Inventar automatisch aktualisieren wenn Produkt verknüpft
      if (type === 'INCOME' && productId) {
        const product = data.products.find((p) => p.id === productId)
        if (product) {
          await update<Product>('product', {
            ...product,
            quantity: product.quantity - qty,
          })
        }
      }

      setDescription('')
      setQuantity('1')
      setAmount('')
      setProductId('')
      setCreditId('')
      onAdd()
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack mt={3} gap={2} flexWrap="wrap">
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        size="sm"
        w="140px"
      />
      <ProductAutocomplete
        products={type === 'INCOME' ? products : []}
        value={description}
        onChange={(desc, pid) => { setDescription(desc); setProductId(pid ?? '') }}
      />
      {type === 'INCOME' && (
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Anz."
          size="sm"
          w="60px"
        />
      )}
      {credits.length > 0 && type === 'INCOME' && (
        <select
          value={creditId}
          onChange={(e) => setCreditId(e.target.value)}
          style={{ fontSize: '14px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
        >
          <option value="">Kein Kredit</option>
          {credits.map((c) => (
            <option key={c.id} value={c.id}>{c.personName}</option>
          ))}
        </select>
      )}
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Betrag €"
        size="sm"
        w="100px"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button size="sm" onClick={submit} loading={loading}>+</Button>
    </HStack>
  )
}

// ─── Transaktionszeile ────────────────────────────────────────────────────────

function TransactionRow({ tx, products }: { tx: Transaction; products: Product[] }) {
  const { remove } = useData()
  const product = products.find((p) => p.id === tx.productId)
  

  return (
    <Table.Row>
      <Table.Cell fontSize="sm" color="gray.600">{tx.date}</Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{tx.description}</Text>
        {product && <Badge size="sm" colorPalette="blue" ml={1}>{product.name}</Badge>}
      </Table.Cell>
      {tx.type === 'INCOME' && <Table.Cell fontSize="sm">{tx.quantity ?? 1}</Table.Cell>}
      <Table.Cell fontSize="sm" fontWeight="medium">{formatEur(tx.amountCents)}</Table.Cell> 
      {isAdmin() && (
        <Table.Cell>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => remove('transaction', tx.id)}>
            <FaTrash/>
          </Button>
        </Table.Cell>
      )}
    </Table.Row>
  )
}

// ─── Cash-Block ───────────────────────────────────────────────────────────────

function CashBlock({ month, year, transactions }: { month: number; year: number; transactions: Transaction[] }) {
  const { data, create, update } = useData()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const monthlyCash = data.monthlyCashes.find((m) => m.month === month && m.year === year)

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + t.amountCents, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amountCents, 0)

  const cashStart = monthlyCash?.cashStartCents ?? 0
  const cashNow = cashStart + totalIncome - totalExpense
  const plus = totalIncome - totalExpense

  async function saveCashStart() {
    setLoading(true)
    try {
      const cents = parseEur(input)
      if (monthlyCash) {
        await update('monthlyCash', { ...monthlyCash, cashStartCents: cents })
      } else {
        await create('monthlyCash', { month, year, cashStartCents: cents })
      }
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HStack gap={6} bg="white" p={4} rounded="lg" shadow="sm" mb={6} flexWrap="wrap">
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="gray.500">Cash letzter Monat</Text>
        {editing ? (
          <HStack>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              size="xs"
              w="120px"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveCashStart()}
            />
            <Button size="xs" onClick={saveCashStart} loading={loading}>OK</Button>
            <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>×</Button>
          </HStack>
        ) : (
          <Text fontWeight="bold" cursor="pointer" onClick={() => { setInput((cashStart / 100).toFixed(2)); setEditing(true) }}>
            {formatEur(cashStart)} ✎
          </Text>
        )}
      </VStack>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="gray.500">Cash jetzt</Text>
        <Text fontWeight="bold">{formatEur(cashNow)}</Text>
      </VStack>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="gray.500">Plus/Minus</Text>
        <Text fontWeight="bold" color={plus >= 0 ? 'green.600' : 'red.600'}>{formatEur(plus)}</Text>
      </VStack>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="gray.500">Einnahmen</Text>
        <Text fontWeight="bold" color="green.600">{formatEur(totalIncome)}</Text>
      </VStack>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="gray.500">Ausgaben</Text>
        <Text fontWeight="bold" color="red.600">{formatEur(totalExpense)}</Text>
      </VStack>
    </HStack>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export default function BudgetPage() {
  const { data, loading } = useData()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const transactions = useMemo(
    () => data.transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    }),
    [data.transactions, month, year]
  )

  const income = transactions.filter((t) => t.type === 'INCOME')
    .sort((a, b) => a.date.localeCompare(b.date))
  const expenses = transactions.filter((t) => t.type === 'EXPENSE')
    .sort((a, b) => a.date.localeCompare(b.date))

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  if (loading) return <Spinner />

  return (
    <Box>
      {/* Monat Navigation */}
      <Flex align="center" gap={4} mb={6}>
        <Heading>Budget</Heading>
        <HStack>
          <Button size="sm" variant="outline" onClick={prevMonth}>←</Button>
          <Text fontWeight="semibold" minW="140px" textAlign="center">
            {MONTHS[month - 1]} {year}
          </Text>
          <Button size="sm" variant="outline" onClick={nextMonth}>→</Button>
        </HStack>
      </Flex>

      {/* Cash Übersicht */}
      <CashBlock month={month} year={year} transactions={transactions} />

      {/* Einnahmen & Ausgaben */}
      <Flex gap={6} flexDir={{ base: 'column', lg: 'row' }}>

        {/* Einnahmen */}
        <Box flex={1} bg="white" rounded="lg" shadow="sm" p={4}>
          <Heading size="sm" color="green.600" mb={3}>
            Einnahmen — {formatEur(income.reduce((s, t) => s + t.amountCents, 0))}
          </Heading>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Datum</Table.ColumnHeader>
                <Table.ColumnHeader>Produkt</Table.ColumnHeader>
                <Table.ColumnHeader>Anz.</Table.ColumnHeader>
                <Table.ColumnHeader>Preis</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {income.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} products={data.products} />
              ))}
            </Table.Body>
          </Table.Root>
          {isAdmin() && (
            <AddTransactionForm
              type="INCOME"
              month={month}
              year={year}
              products={data.products}
            credits={data.credits}
            onAdd={() => {}}
          />)}
        </Box>

        {/* Ausgaben */}
        <Box flex={1} bg="white" rounded="lg" shadow="sm" p={4}>
          <Heading size="sm" color="red.600" mb={3}>
            Ausgaben — {formatEur(expenses.reduce((s, t) => s + t.amountCents, 0))}
          </Heading>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Datum</Table.ColumnHeader>
                <Table.ColumnHeader>Produkt</Table.ColumnHeader>
                <Table.ColumnHeader>Preis</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {expenses.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} products={data.products} />
              ))}
            </Table.Body>
          </Table.Root>
          {isAdmin() && (
          <AddTransactionForm
            type="EXPENSE"
            month={month}
            year={year}
            products={data.products}
            credits={data.credits}
            onAdd={() => {}}
          />)}
        </Box>

      </Flex>
    </Box>
  )
}
