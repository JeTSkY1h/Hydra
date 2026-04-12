import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Box, Flex, Text, Button, VStack, HStack } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import UnlockOverlay from './UnlockOverlay'
import SettingsModal from './SettingsModal'

const navItems = [
  { to: '/', label: 'Übersicht', end: true },
  { to: '/inventar', label: 'Inventar' },
  { to: '/budget', label: 'Budget' },
  { to: '/kredite', label: 'Kredite' },
  { to: '/vermoegen', label: 'Vermögen' },
  { to: '/einstellungen', label: 'Einstellungen' },
]

export default function Layout() {
  const { logout, vaultKey } = useAuth()
  const { loadAll } = useData()
  const navigate = useNavigate()

  useEffect(() => {
    if (vaultKey) loadAll()
  }, [vaultKey, loadAll])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!vaultKey) return <UnlockOverlay />

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Box w="200px" bg="gray.900" color="white" p={4} flexShrink={0} display="flex" flexDirection="column">
        <Text fontWeight="bold" fontSize="lg" mb={8}>Hydra</Text>
        <VStack align="stretch" gap={1} flex={1}>
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {({ isActive }) => (
                <Box
                  px={3} py={2} rounded="md" fontSize="sm"
                  bg={isActive ? 'gray.700' : 'transparent'}
                  _hover={{ bg: 'gray.700' }}
                  cursor="pointer"
                >
                  {label}
                </Box>
              )}
            </NavLink>
          ))}
        </VStack>

        <HStack mt="auto" gap={1}>
          <SettingsModal />
          <Button
            variant="ghost"
            color="gray.400"
            size="sm"
            onClick={handleLogout}
            flex={1}
          >
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* Hauptinhalt */}
      <Box flex={1} p={8} bg="gray.50" overflowY="auto">
        <Outlet />
      </Box>
    </Flex>
  )
}
