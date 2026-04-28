import { useState, useRef, useEffect } from 'react'
import { Box, Input, Text } from '@chakra-ui/react'
import type { Product } from '@hydra/shared'
import { useTheme } from '../context/ThemeContext'

type Props = {
  products: Product[]
  value: string
  onChange: (description: string, productId?: string) => void
  placeholder?: string
}

export default function ProductAutocomplete({ products, value, onChange, placeholder }: Props) {
  const { isDark } = useTheme()
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = value.length >= 1
    ? products
        .filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : []

  // Schließen wenn außerhalb geklickt wird
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(product: Product) {
    onChange(product.name, product.id)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') e.preventDefault() // nie das Form submitten
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      select(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Box ref={containerRef} position="relative" flex={1} minW="120px">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value, undefined)
          setOpen(true)
          setHighlighted(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Beschreibung'}
        size="sm"
        bg={isDark ? 'gray.700' : 'white'}
        color={isDark ? 'gray.300' : 'gray.800'}
        borderColor={isDark ? 'gray.600' : 'gray.200'}
        _placeholder={{ color: isDark ? 'gray.400' : 'gray.400' }}
      />
      {open && suggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={100}
          bg={isDark ? 'gray.700' : 'white'}
          border="1px solid"
          borderColor={isDark ? 'gray.600' : 'gray.200'}
          rounded="md"
          shadow="md"
          mt={1}
          maxH="240px"
          overflowY="auto"
        >
          {suggestions.map((p, i) => (
            <Box
              key={p.id}
              px={3}
              py={2}
              cursor="pointer"
              bg={i === highlighted ? isDark ? 'blue.900' : 'blue.50' : 'transparent'}
              _hover={{ bg: isDark ? 'blue.900' : 'blue.50' }}
              onMouseDown={() => select(p)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <Text fontSize="sm" color={isDark ? 'gray.300' : 'gray.800'}>{p.name}</Text>
              <Text fontSize="xs" color={isDark ? 'gray.500' : 'gray.400'}>Bestand: {p.quantity}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
