import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Box, Input, Text, Portal } from '@chakra-ui/react'
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
  type Pos = { left: number; width: number; top?: number; bottom?: number; maxH: number }
  const [pos, setPos] = useState<Pos | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = value.length >= 1
    ? products
        .filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : []

  // Dropdown wird per Portal gerendert (umgeht overflow:auto/hidden von
  // Vorfahren wie dem scrollbaren Layout-Hauptbereich) — Position also
  // manuell anhand der Input-Bounding-Box berechnen. Ist unten nicht genug
  // Platz (Input steht am unteren Rand der Seite), klappt das Dropdown
  // stattdessen nach oben auf; bei Scroll/Resize wird neu berechnet.
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return
    function updateRect() {
      const r = containerRef.current!.getBoundingClientRect()
      const margin = 8
      const preferredH = 240
      const spaceBelow = window.innerHeight - r.bottom - margin
      const spaceAbove = r.top - margin

      if (spaceBelow >= preferredH || spaceBelow >= spaceAbove) {
        setPos({
          left: r.left,
          width: r.width,
          top: r.bottom + 4,
          maxH: Math.max(100, Math.min(preferredH, spaceBelow)),
        })
      } else {
        setPos({
          left: r.left,
          width: r.width,
          bottom: window.innerHeight - r.top + 4,
          maxH: Math.max(100, Math.min(preferredH, spaceAbove)),
        })
      }
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    document.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      document.removeEventListener('scroll', updateRect, true)
    }
  }, [open])

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
      {open && suggestions.length > 0 && pos && (
        <Portal>
          <Box
            position="fixed"
            top={pos.top !== undefined ? `${pos.top}px` : undefined}
            bottom={pos.bottom !== undefined ? `${pos.bottom}px` : undefined}
            left={`${pos.left}px`}
            width={`${pos.width}px`}
            zIndex={1500}
            bg={isDark ? 'gray.700' : 'white'}
            border="1px solid"
            borderColor={isDark ? 'gray.600' : 'gray.200'}
            rounded="md"
            shadow="md"
            maxH={`${pos.maxH}px`}
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
        </Portal>
      )}
    </Box>
  )
}
