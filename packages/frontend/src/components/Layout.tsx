import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Flex, Text, Button, VStack, HStack, IconButton,
  Drawer, Portal,
} from '@chakra-ui/react'
import { FaBars, FaMoon, FaSun, FaXmark } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import UnlockOverlay from './UnlockOverlay'
import SettingsModal from './SettingsModal'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/', label: 'Übersicht', end: true },
  { to: '/inventar', label: 'Inventar' },
  { to: '/budget', label: 'Budget' },
  { to: '/kredite', label: 'Kredite' },
  { to: '/vermoegen', label: 'Vermögen' },
  { to: '/aufgaben', label: 'Aufgaben' },
  { to: '/einstellungen', label: 'Nutzerverwaltung' },
]

function NavLinks({ onClose }: { onClose?: () => void }) {
  const { isDark, toggle } = useTheme()
  return (
    <VStack align="stretch" gap={1} flex={1}>
      {navItems.map(({ to, label, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onClose}>
          {({ isActive }) => (
            <Box
              px={3} py={2} rounded="md" fontSize="sm"
              bg={isActive ? isDark ? 'gray.700' : 'gray.200' : 'transparent'}
              _hover={{ bg: isDark ? 'gray.700' : 'gray.200', color: isDark ? 'white' : 'gray.800' }}
              color={isDark ? "white" : isActive ? "gray.800" : "gray.200"}
              cursor="pointer"
            >
              {label}
            </Box>
          )}
        </NavLink>
      ))}
    </VStack>
  )
}

export default function Layout() {
  const { logout, vaultKey } = useAuth()
  const { loadAll } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isDark, toggle } = useTheme()

  useEffect(() => {
    if (vaultKey) loadAll()
  }, [vaultKey, loadAll])

  // Drawer schließen wenn Route wechselt
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!vaultKey) return <UnlockOverlay />

  return (
    <Flex minH="100vh">

      {/* ── Desktop-Sidebar (ab md) ─────────────────────────────────── */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        position="fixed"
        top={0}
        left={0}
        w="200px"
        h="100vh"
        bg={isDark ? "gray.900" : "gray.700"}
        color="white"
        p={4}
        flexShrink={0}
        flexDirection="column"
      >
        <Text fontWeight="bold" fontSize="lg" mb={8}>Hydra</Text>
        <NavLinks />
        <HStack mt="auto" gap={1}>
          <SettingsModal />
          <IconButton variant="ghost" color="gray.400" size="sm" aria-label="Theme wechseln" onClick={toggle}>
            {isDark ? <FaSun /> : <FaMoon />}
          </IconButton>
          <Button variant="ghost" bg={isDark ? "gray.600" : "gray.500"} color="gray.400" size="sm" onClick={handleLogout} flex={1}>
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* ── Rechte Seite ────────────────────────────────────────────── */}
      <Flex flex={1} direction="column" minW={0} ml={{ base: 0, md: '200px' }}>

        {/* Mobile-Topbar (bis md) */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          align="center"
          justify="space-between"
          px={4}
          py={3}
          bg="gray.900"
          color="white"
          flexShrink={0}
        >
          <Text fontWeight="bold" fontSize="md">Hydra</Text>
          <IconButton
            aria-label="Menü öffnen"
            variant="ghost"
            color="white"
            size="sm"
            onClick={() => setDrawerOpen(true)}
          >
            <FaBars />
          </IconButton>
        </Flex>

        {/* Hauptinhalt */}
        <Box flex={1} p={{ base: 4, md: 8 }} bg={isDark ? "gray.800" : "gray.50"} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>

      {/* ── Mobile Drawer ────────────────────────────────────────────── */}
      <Drawer.Root open={drawerOpen} onOpenChange={e => setDrawerOpen(e.open)} placement="start">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg={isDark ? "gray.900" : "gray.700"} color="white" maxW="240px">
              <Drawer.Header borderBottomWidth={0} pt={4} pb={2}>
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold" fontSize="lg">Hydra</Text>
                  <Drawer.CloseTrigger asChild>
                    <IconButton aria-label="Schließen" variant="ghost" color="gray.400" size="sm">
                      <FaXmark />
                    </IconButton>
                  </Drawer.CloseTrigger>
                </Flex>
              </Drawer.Header>
              <Drawer.Body px={4} py={2} display="flex" flexDirection="column">
                <NavLinks onClose={() => setDrawerOpen(false)} />
                <HStack mt={6} gap={1}>
                  <SettingsModal />
                  <IconButton variant="ghost" color="gray.400" size="sm" aria-label="Theme wechseln" onClick={toggle}>
                    {isDark ? <FaSun /> : <FaMoon />}
                  </IconButton>
                  <Button
                    variant="ghost"
                    color="gray.400"
                    size="sm"
                    onClick={() => { setDrawerOpen(false); handleLogout() }}
                    flex={1}
                  >
                    Abmelden
                  </Button>

                </HStack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

    </Flex>
  )
}
