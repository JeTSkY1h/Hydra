import { useState, useMemo } from 'react'
import {
  Box, Flex, Heading, Text, HStack, VStack, Badge, Button,
} from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import type { Transaction } from '@hydra/shared'

const MEMBER_FEE_CENTS = 5000 // 50€ pro Mitglied pro Monat

function formatEur(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

type Period = 'month' | 'all'

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// ─── Gewinnbalken ─────────────────────────────────────────────────────────────

function ProfitBar({ value, max, color }: { value: number; max: number; color: string }) {
  const { isDark } = useTheme()
  const pct = max > 0 ? Math.max(0, (value / max) * 100) : 0
  return (
    <Box bg={isDark ? 'gray.600' : 'gray.100'} rounded="full" h="6px" flex={1}>
      <Box bg={color} rounded="full" h="6px" w={`${pct}%`} transition="width 0.4s" />
    </Box>
  )
}

// ─── Kategorie-Ranking ────────────────────────────────────────────────────────

const UNCATEGORIZED_ID = '__uncategorized__'

function CategoryRanking({ transactions, period, month, year }: {
  transactions: Transaction[]
  period: Period
  month: number
  year: number
}) {
  const { data } = useData()
  const { isDark } = useTheme()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (period === 'all') return transactions
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
  }, [transactions, period, month, year])

  const categoryStats = useMemo(() => {
    const stats: Record<string, { revenue: number; cost: number; name: string }> = {}

    for (const cat of data.categories) {
      stats[cat.id] = { revenue: 0, cost: 0, name: cat.name }
    }

    for (const tx of filtered) {
      if (tx.type !== 'INCOME' || !tx.productId) continue
      const product = data.products.find((p) => p.id === tx.productId)
      if (!product) continue
      const catId = product.categoryId
      if (!stats[catId]) continue

      stats[catId].revenue += tx.amountCents
      if (product.buyPrice) {
        stats[catId].cost += (tx.quantity ?? 1) * product.buyPrice
      }
    }

    const entries = Object.entries(stats)
      .map(([id, s]) => ({ id, ...s, profit: s.revenue - s.cost }))
      .filter((s) => s.revenue > 0)

    const uncatRevenue = filtered
      .filter((t) => t.type === 'INCOME' && !t.productId)
      .reduce((s, t) => s + t.amountCents, 0)

    if (uncatRevenue > 0) {
      entries.push({ id: UNCATEGORIZED_ID, name: 'Sonstige Einnahmen', revenue: uncatRevenue, cost: 0, profit: uncatRevenue })
    }

    return entries.sort((a, b) => b.profit - a.profit)
  }, [filtered, data.categories, data.products])

  const productStats = useMemo(() => {
    const catId = selectedCategoryId ?? categoryStats[0]?.id
    if (!catId) return []

    if (catId === UNCATEGORIZED_ID) {
      const grouped: Record<string, { revenue: number; cost: number; name: string; quantity: number }> = {}
      for (const tx of filtered) {
        if (tx.type !== 'INCOME' || tx.productId) continue
        const key = tx.description || 'Ohne Beschreibung'
        if (!grouped[key]) grouped[key] = { revenue: 0, cost: 0, name: key, quantity: 0 }
        grouped[key].revenue += tx.amountCents
        grouped[key].quantity += 1
      }
      return Object.entries(grouped)
        .map(([id, s]) => ({ id, ...s, profit: s.revenue }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
    }

    const stats: Record<string, { revenue: number; cost: number; name: string; quantity: number }> = {}

    for (const tx of filtered) {
      if (tx.type !== 'INCOME' || !tx.productId) continue
      const product = data.products.find((p) => p.id === tx.productId)
      if (!product || product.categoryId !== catId) continue

      if (!stats[product.id]) {
        stats[product.id] = { revenue: 0, cost: 0, name: product.name, quantity: 0 }
      }
      const qty = tx.quantity ?? 1
      stats[product.id].revenue += tx.amountCents
      stats[product.id].quantity += qty
      if (product.buyPrice) {
        stats[product.id].cost += qty * product.buyPrice
      }
    }

    return Object.entries(stats)
      .map(([id, s]) => ({ id, ...s, profit: s.revenue - s.cost }))
      .filter((s) => s.revenue > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
  }, [filtered, data.products, selectedCategoryId, categoryStats])

  const activeCategoryId = selectedCategoryId ?? categoryStats[0]?.id
  const maxProfit = categoryStats[0]?.profit ?? 1
  const maxProductProfit = productStats[0]?.profit ?? 1
  const isUncategorized = activeCategoryId === UNCATEGORIZED_ID

  if (categoryStats.length === 0) {
    return <Text color="gray.400" fontSize="sm">Noch keine verknüpften Einnahmen vorhanden.</Text>
  }

  return (
    <Flex gap={6} flexDir={{ base: 'column', lg: 'row' }}>
      {/* Kategorien */}
      <Box flex={1} bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" p={5}>
        <Heading size="sm" mb={4}>Kategorien nach Gewinn</Heading>
        <VStack align="stretch" gap={3}>
          {categoryStats.map((cat, i) => (
            <Box
              key={cat.id}
              cursor="pointer"
              onClick={() => setSelectedCategoryId(cat.id)}
              p={2}
              rounded="md"
              bg={cat.id === activeCategoryId ? isDark ? 'blue.900' : 'blue.50' : 'transparent'}
              _hover={{ bg: isDark ? 'gray.600' : 'gray.50' }}
            >
              <Flex justify="space-between" mb={1}>
                <HStack gap={2}>
                  {i === 0 && <Badge colorPalette="yellow" size="sm">★ Best</Badge>}
                  <Text fontSize="sm" fontWeight={cat.id === activeCategoryId ? 'bold' : 'normal'} color={isDark ? "gray.100" : "black"}>
                    {cat.name}
                  </Text>
                </HStack>
                <VStack align="end" gap={0}>
                  <Text fontSize="sm" fontWeight="bold" color={cat.profit >= 0 ? isDark ? 'green.400' : 'green.600' : isDark ? 'red.400' : 'red.500'}>
                    {formatEur(cat.profit)}
                  </Text>
                  <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.400'}>
                    Einnahmen: {formatEur(cat.revenue)}
                  </Text>
                </VStack>
              </Flex>
              <ProfitBar value={cat.profit} max={maxProfit} color={i === 0 ? '#ECC94B' : '#4299E1'} />
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Einzel-Einnahmen oder Top-Produkte der ausgewählten Kategorie */}
      <Box flex={1} bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" p={5}>
        <Heading size="sm" mb={1}>
          {isUncategorized
            ? 'Einnahmen ohne Kategorie'
            : `Top Produkte — ${data.categories.find((c) => c.id === activeCategoryId)?.name}`}
        </Heading>
        <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'} mb={4}>Klick auf eine Kategorie um sie zu wechseln</Text>
        {productStats.length === 0
          ? <Text color="gray.400" fontSize="sm">Keine Daten</Text>
          : (
            <VStack align="stretch" gap={3}>
              {productStats.map((p, i) => (
                <Box key={p.id}>
                  <Flex justify="space-between" mb={1}>
                    <HStack gap={2}>
                      {i === 0 && <Badge colorPalette="green" size="sm">★ Top</Badge>}
                      <Text fontSize="sm">{p.name}</Text>
                      {!isUncategorized && (
                        <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'}>{p.quantity}×</Text>
                      )}
                      {isUncategorized && p.quantity > 1 && (
                        <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'}>{p.quantity}×</Text>
                      )}
                    </HStack>
                    <VStack align="end" gap={0}>
                      <Text fontSize="sm" fontWeight="bold" color={p.profit >= 0 ? isDark ? 'green.400' : 'green.600' : isDark ? 'red.400' : 'red.500'}>
                        {formatEur(p.profit)}
                      </Text>
                      {!isUncategorized && (
                        <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'}>
                          {formatEur(p.revenue)} Einnahmen
                        </Text>
                      )}
                    </VStack>
                  </Flex>
                  <ProfitBar value={p.profit} max={maxProductProfit} color={i === 0 ? '#48BB78' : '#68D391'} />
                </Box>
              ))}
            </VStack>
          )
        }
      </Box>
    </Flex>
  )
}

// ─── Gesamtwert Block ─────────────────────────────────────────────────────────

function TotalBlock() {
  const { data } = useData()
  const { isDark } = useTheme()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const memberCount = data.settings?.memberCount ?? 0

  const monthlyCash = data.monthlyCashes.find((m) => m.month === month && m.year === year)
  const monthTransactions = data.transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const income = monthTransactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0)
  const expenses = monthTransactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0)
  const cash = (monthlyCash?.cashStartCents ?? 0) + income - expenses

  const validCategoryIds = new Set(data.categories.map(c => c.id))
  const inventoryValue = data.products
    .filter(p => validCategoryIds.has(p.categoryId))
    .reduce((s, p) => s + (p.buyPrice ?? 0) * p.quantity, 0)
  const assetValue = data.assets.reduce((s, a) => s + a.valueCents, 0)
  const openCredits = data.credits.reduce((sum, credit) => {
    const paid = data.transactions
      .filter((t) => t.creditId === credit.id)
      .reduce((s, t) => s + t.amountCents, 0)
    return sum + Math.max(0, credit.startAmountCents - paid)
  }, 0)

  const total = cash + inventoryValue + assetValue + openCredits
  const perPerson = memberCount > 0 ? Math.round(total / memberCount) : null

  const items = [
    { label: 'Cash', value: cash },
    { label: 'Inventar', value: inventoryValue },
    { label: 'Vermögen', value: assetValue },
    { label: 'Offene Kredite', value: openCredits },
  ]

  return (
    <Box bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" p={5} mb={6}>
      <Flex justify="space-between" align="start" flexWrap="wrap" gap={4}>
        {items.map(({ label, value }) => (
          <VStack key={label} align="start" gap={0}>
            <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.500'}>{label}</Text>
            <Text fontWeight="semibold">{formatEur(value)}</Text>
          </VStack>
        ))}
        <Box w="1px" bg={isDark ? 'gray.600' : 'gray.200'} alignSelf="stretch" display={{ base: 'none', lg: 'block' }} />
        <VStack align="start" gap={0}>
          <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.500'}>Gesamt</Text>
          <Text fontWeight="bold" fontSize="lg">{formatEur(total)}</Text>
        </VStack>
        {perPerson !== null && (
          <VStack align="start" gap={0}>
            <Text fontSize="xs" color={isDark ? 'gray.400' : 'gray.500'}>Pro Person ({memberCount})</Text>
            <Text fontWeight="bold" fontSize="lg" color={isDark ? 'blue.400' : 'blue.600'}>{formatEur(perPerson)}</Text>
          </VStack>
        )}
        {memberCount === 0 && (
          <Text fontSize="xs" color="orange.400">
            Mitgliederanzahl in Einstellungen setzen
          </Text>
        )}
      </Flex>
    </Box>
  )
}

// ─── Monatsverlauf ────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

type ChartEntry = {
  label: string
  month: number
  year: number
  Einnahmen: number
  Ausgaben: number
  Nettogewinn: number
  Mitgliedsbeiträge: number
}

function MonthlyChart({ onMonthSelect, selectedMonth }: {
  onMonthSelect: (month: number, year: number) => void
  selectedMonth: { month: number; year: number } | null
}) {
  const { data } = useData()
  const { isDark } = useTheme()
  const memberCount = data.settings?.memberCount ?? 0

  const chartData = useMemo<ChartEntry[]>(() => {
    const months: { year: number; month: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }

    return months.map(({ year, month }) => {
      const txs = data.transactions.filter((t) => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
      const income = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0)
      const expenses = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0)
      const cogs = txs
        .filter((t) => t.type === 'INCOME' && t.productId)
        .reduce((s, t) => {
          const product = data.products.find((p) => p.id === t.productId)
          return s + (product?.buyPrice ?? 0) * (t.quantity ?? 1)
        }, 0)
      const breakeven = memberCount * MEMBER_FEE_CENTS
      const net = income - cogs - expenses

      return {
        label: `${MONTH_NAMES[month - 1]} ${year !== now.getFullYear() ? year : ''}`.trim(),
        month,
        year,
        Einnahmen: income / 100,
        Ausgaben: expenses / 100,
        Nettogewinn: net / 100,
        Mitgliedsbeiträge: breakeven / 100,
      }
    })
  }, [data.transactions, memberCount])

  const hasData = chartData.some((d) => d.Einnahmen > 0 || d.Ausgaben > 0)
  if (!hasData) return null

  const formatTooltip = (value: unknown) =>
    typeof value === 'number'
      ? value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : String(value ?? '')

  const tickColor = isDark ? '#a0aec0' : '#4a5568'
  const gridColor = isDark ? '#4a5568' : '#e2e8f0'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (entry: any) => {
    onMonthSelect(entry.month as number, entry.year as number)
  }

  const isSelected = (entry: ChartEntry) =>
    selectedMonth !== null &&
    entry.month === selectedMonth.month &&
    entry.year === selectedMonth.year

  return (
    <Box bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" p={5} mb={6}>
      <Heading size="sm" mb={1}>Monatsverlauf</Heading>
      <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'} mb={4}>
        Mitgliedsbeiträge = {memberCount} × 50 € Break-even · Klick auf einen Balken zum Filtern
      </Text>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} />
          <YAxis tickFormatter={(v) => `${v} €`} tick={{ fontSize: 11, fill: tickColor }} width={70} />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: isDark ? '#2d3748' : 'white',
              borderColor: isDark ? '#4a5568' : '#e2e8f0',
              color: isDark ? '#e2e8f0' : '#1a202c',
            }}
          />
          <Legend wrapperStyle={{ color: tickColor }} />
          <ReferenceLine
            y={memberCount * MEMBER_FEE_CENTS / 100}
            stroke="#ED8936"
            strokeDasharray="5 5"
            label={{ value: 'Break-even', position: 'insideTopRight', fontSize: 11, fill: '#ED8936' }}
          />
          <Bar dataKey="Einnahmen" radius={[3, 3, 0, 0]} onClick={handleBarClick}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={isSelected(entry) ? '#276749' : '#48BB78'} opacity={selectedMonth && !isSelected(entry) ? 0.45 : 1} />
            ))}
          </Bar>
          <Bar dataKey="Ausgaben" radius={[3, 3, 0, 0]} onClick={handleBarClick}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={isSelected(entry) ? '#c53030' : '#FC8181'} opacity={selectedMonth && !isSelected(entry) ? 0.45 : 1} />
            ))}
          </Bar>
          <Bar dataKey="Nettogewinn" radius={[3, 3, 0, 0]} onClick={handleBarClick}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={isSelected(entry) ? '#2b6cb0' : '#4299E1'} opacity={selectedMonth && !isSelected(entry) ? 0.45 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data } = useData()
  const { isDark } = useTheme()
  const now = new Date()

  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null)

  const period: Period = selectedMonth ? 'month' : 'all'
  const month = selectedMonth?.month ?? now.getMonth() + 1
  const year = selectedMonth?.year ?? now.getFullYear()

  const handleMonthSelect = (m: number, y: number) => {
    if (selectedMonth?.month === m && selectedMonth?.year === y) {
      setSelectedMonth(null)
    } else {
      setSelectedMonth({ month: m, year: y })
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading>Übersicht</Heading>
          <Text fontSize="sm" color={isDark ? 'gray.400' : 'gray.500'} mt={1}>
            {selectedMonth ? `${MONTHS[month - 1]} ${year}` : 'Gesamt'}
          </Text>
        </Box>
        {selectedMonth && (
          <Button
            color={isDark ? 'white' : ''}
            size="sm"
            variant="outline"
            onClick={() => setSelectedMonth(null)}
          >
            Gesamt anzeigen
          </Button>
        )}
      </Flex>

      <TotalBlock />
      <MonthlyChart onMonthSelect={handleMonthSelect} selectedMonth={selectedMonth} />
      <CategoryRanking
        transactions={data.transactions}
        period={period}
        month={month}
        year={year}
      />
    </Box>
  )
}
