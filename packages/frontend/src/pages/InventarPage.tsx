import { useState } from 'react'
import {
  Box, Button, Flex, Heading, Input, Text, VStack, HStack,
  Table, Badge, IconButton, Spinner,
} from '@chakra-ui/react'
import type { Category, Product } from '@hydra/shared'
import { useData } from '../context/DataContext'
import { FaTrashAlt, FaPen } from "react-icons/fa"
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatPrice(cents?: number) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function isAdmin() {
  const { role } = useAuth()
  return role === 'ADMIN'
}

// ─── Kategorie hinzufügen ─────────────────────────────────────────────────────

function AddCategoryForm({ onDone }: { onDone: () => void }) {
  const { create } = useData()
  const { isDark } = useTheme()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await create<Category>('category', { name: name.trim() })
      setName('')
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

  return (
    <HStack>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kategoriename"
        size="sm"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        {...inputProps}
      />
      <Button size="sm" onClick={submit} loading={loading}>Hinzufügen</Button>
    </HStack>
  )
}

// ─── Produkt hinzufügen ───────────────────────────────────────────────────────

function AddProductForm({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
  const { create } = useData()
  const { isDark } = useTheme()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await create<Product>('product', {
        name: name.trim(),
        quantity: parseInt(quantity) || 0,
        buyPrice: buyPrice ? Math.round(parseFloat(buyPrice.replace(',', '.')) * 100) : undefined,
        categoryId,
      })
      setName('')
      setQuantity('')
      setBuyPrice('')
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

  return (
    <HStack mt={2}>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'contents' }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Produktname" size="sm" {...inputProps} />
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Anzahl" size="sm" w="80px" {...inputProps} />
        <Input value={buyPrice} onKeyDown={(e) => e.key === 'Enter' && submit()} onChange={(e) => setBuyPrice(e.target.value)} placeholder="Preis €" size="sm" w="90px" {...inputProps} />
        <Button size="sm" onClick={submit} loading={loading}>+</Button>
      </form>
    </HStack>
  )
}

// ─── Produkt bearbeiten ───────────────────────────────────────────────────────

function EditProductForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { update } = useData()
  const { isDark } = useTheme()
  const [prductId, setProductId] = useState(product.id)
  const [name, setName] = useState(product.name)
  const [quantity, setQuantity] = useState(product.quantity.toString())
  const [buyPrice, setBuyPrice] = useState(product.buyPrice ? (product.buyPrice / 100).toFixed(2) : '')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await update<Product>('product', {
        id: prductId,
        name: name.trim(),
        quantity: parseInt(quantity) || 0,
        buyPrice: buyPrice ? Math.round(parseFloat(buyPrice.replace(',', '.')) * 100) : undefined,
        categoryId: product.categoryId,
      })
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

  return (
    <HStack mt={2}>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'contents' }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Produktname" size="sm" {...inputProps} />
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Anzahl" size="sm" w="80px" {...inputProps} />
        <Input value={buyPrice} onKeyDown={(e) => e.key === 'Enter' && submit()} onChange={(e) => setBuyPrice(e.target.value)} placeholder="Preis €" size="sm" w="90px" {...inputProps} />
        <Button size="sm" onClick={submit} loading={loading}>Änderungen speichern</Button>
      </form>
    </HStack>
  )
}

// ─── Produktzeile ─────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: Product }) {
  const { update, remove } = useData()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const { isDark } = useTheme()

  async function changeQuantity(delta: number) {
    const newQty = Math.max(0, product.quantity + delta)
    setLoading(true)
    try {
      await update<Product>('product', { ...product, quantity: newQty })
    } finally {
      setLoading(false)
    }
  }

  return (
    (editing) ? <EditProductForm product={product} onDone={() => setEditing(false)} /> :
    <Table.Row>
      <Table.Cell>{product.name}</Table.Cell>
      <Table.Cell>
        <HStack gap={2}>
          {isAdmin() && (
            <IconButton
              aria-label="minus"
              size="xs"
              variant="ghost"
              bg={isDark ? 'gray.600' : 'gray.100'}
              _hover={{ bg: isDark ? 'gray.500' : 'gray.200' }}
              color={isDark ? 'gray.200' : 'gray.700'}
              onClick={() => changeQuantity(-1)}
              disabled={product.quantity === 0 || loading}
            >−</IconButton>
          )}
          <Badge justifyContent="center" minW="8" display="flex" colorPalette={product.quantity === 0 ? 'red' : product.quantity < 5 ? 'orange' : 'green'}>
            {product.quantity}
          </Badge>
          {isAdmin() && (
            <IconButton
              aria-label="plus"
              size="xs"
              variant="ghost"
              bg={isDark ? 'gray.600' : 'gray.100'}
              _hover={{ bg: isDark ? 'gray.500' : 'gray.200' }}
              color={isDark ? 'gray.200' : 'gray.700'}
              onClick={() => changeQuantity(1)}
              disabled={loading}
            >+</IconButton>
          )}
        </HStack>
      </Table.Cell>
      <Table.Cell>{formatPrice(product.buyPrice)}</Table.Cell>
      <Table.Cell>{formatPrice((product.buyPrice ?? 0) * product.quantity)}</Table.Cell>
      {isAdmin() && (<Table.Cell>
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          <FaPen />
        </Button>
      </Table.Cell>)}
      {isAdmin() && (<Table.Cell>
        <Button size="xs" colorPalette="red" variant="ghost" onClick={() => remove('product', product.id)}>
          <FaTrashAlt />
        </Button>
      </Table.Cell>)}
    </Table.Row>
  )
}

// ─── Kategorieblock ───────────────────────────────────────────────────────────

function CategoryBlock({ category, products }: { category: Category; products: Product[] }) {
  const { remove } = useData()
  const { isDark } = useTheme()
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const totalValue = products.reduce((sum, p) => sum + (p.buyPrice ?? 0) * p.quantity, 0)

  return (
    <Box bg={isDark ? 'gray.700' : 'white'} rounded="lg" shadow="sm" p={4} mb={4} overflowX="auto">
      <Flex justify="space-between" align="center" mb={collapsed ? 0 : 3}>
        <HStack gap={2} cursor="pointer" onClick={() => setCollapsed((v) => !v)} flex={1}>
          <Text fontSize="xs" color="gray.400">{collapsed ? '▶' : '▼'}</Text>
          <Heading size="sm">{category.name}</Heading>
          <Text fontSize="sm" color={isDark ? 'gray.400' : 'gray.400'}>
            {formatPrice(totalValue)} · {products.length} Produkte
          </Text>
        </HStack>
        {isAdmin() && (
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => remove('category', category.id)}>
            <FaTrashAlt />
          </Button>
        )}
      </Flex>

      {!collapsed && products.length > 0 && (
        <Table.Root
          size="sm"
          mb={2}
          color={isDark ? 'gray.300' : 'gray.700'}
          css={{ '--chakra-colors-bg': 'transparent' }}
        >
          <Table.Header bg={isDark ? 'gray.700' : 'white'} >
            <Table.Row>
              <Table.ColumnHeader color={isDark ? 'white' : 'black'}>Name</Table.ColumnHeader>
              <Table.ColumnHeader color={isDark ? 'white' : 'black'}>Bestand</Table.ColumnHeader>
              <Table.ColumnHeader color={isDark ? 'white' : 'black'}>Einkaufspreis</Table.ColumnHeader>
              <Table.ColumnHeader color={isDark ? 'white' : 'black'}>Gesamtwert</Table.ColumnHeader>
              {isAdmin() && <Table.ColumnHeader color={isDark ? 'white' : 'black'}> Bearbeiten </Table.ColumnHeader>}
              {isAdmin() && <Table.ColumnHeader color={isDark ? 'white' : 'black'}> Löschen </Table.ColumnHeader>}
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {products.map((p) => <ProductRow key={p.id} product={p} />)}
          </Table.Body>
        </Table.Root>
      )}

      {!collapsed && isAdmin() && (showAddProduct
        ? <AddProductForm categoryId={category.id} onDone={() => setShowAddProduct(false)} />
        : <Button color={isDark ? "gray.200" : ""} size="xs" variant="ghost" onClick={() => setShowAddProduct(true)}>+ Produkt hinzufügen</Button>
      )}
    </Box>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function InventarPage() {
  const { data, loading } = useData()
  const { isDark } = useTheme()
  const [showAddCategory, setShowAddCategory] = useState(false)

  if (loading) return <Spinner />

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading>Inventar</Heading>
        {isAdmin() && (
          <Button
            size="sm"
            variant="ghost"
            bg={isDark ? 'gray.600' : 'gray.100'}
            _hover={{ bg: isDark ? 'gray.500' : 'gray.200' }}
            color={isDark ? 'gray.200' : 'gray.700'}
            onClick={() => setShowAddCategory((v) => !v)}
          >
            {showAddCategory ? 'Abbrechen' : '+ Kategorie'}
          </Button>
        )}
      </Flex>

      {showAddCategory && (
        <Box bg={isDark ? 'gray.700' : 'white'} p={4} rounded="lg" shadow="sm" mb={4}>
          <AddCategoryForm onDone={() => setShowAddCategory(false)} />
        </Box>
      )}

      {data.categories.length === 0 && !showAddCategory && (
        <Text color={isDark ? 'gray.400' : 'gray.500'}>Noch keine Kategorien. Füge eine hinzu.</Text>
      )}

      {data.categories.map((cat) => (
        <CategoryBlock
          key={cat.id}
          category={cat}
          products={data.products.filter((p) => p.categoryId === cat.id)}
        />
      ))}
    </Box>
  )
}
