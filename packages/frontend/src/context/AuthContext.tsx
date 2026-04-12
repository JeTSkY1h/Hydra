import { createContext, useContext, useState } from 'react'
import {
  initCrypto,
  deriveKeypair,
  decryptVaultKey,
} from '../lib/crypto'

type Role = 'ADMIN' | 'MEMBER'

type AuthContextType = {
  token: string | null
  userId: string | null
  role: Role | null
  vaultKey: Uint8Array | null
  login: (token: string, encryptedVaultKey: string, kdfSalt: string, vaultKey: Uint8Array, role: Role, userId: string) => void
  logout: () => void
  // Nach einem Seiten-Reload muss der Vault Key neu entschlüsselt werden
  unlockVaultKey: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('hydra_token')
  )
  const [userId, setUserId] = useState<string | null>(
    () => localStorage.getItem('hydra_user_id')
  )
  const [role, setRole] = useState<Role | null>(
    () => localStorage.getItem('hydra_role') as Role | null
  )
  // Vault Key liegt nur im Memory — verschwindet bei Reload
  const [vaultKey, setVaultKey] = useState<Uint8Array | null>(null)

  function login(token: string, encryptedVaultKey: string, kdfSalt: string, vaultKey: Uint8Array, role: Role, userId: string) {
    localStorage.setItem('hydra_token', token)
    localStorage.setItem('hydra_evk', encryptedVaultKey)
    localStorage.setItem('hydra_kdf_salt', kdfSalt)
    localStorage.setItem('hydra_role', role)
    localStorage.setItem('hydra_user_id', userId)
    setToken(token)
    setVaultKey(vaultKey)
    setRole(role)
    setUserId(userId)
  }

  function logout() {
    localStorage.removeItem('hydra_token')
    localStorage.removeItem('hydra_evk')
    localStorage.removeItem('hydra_kdf_salt')
    localStorage.removeItem('hydra_role')
    localStorage.removeItem('hydra_user_id')
    setToken(null)
    setVaultKey(null)
    setRole(null)
    setUserId(null)
  }

  // Wird nach einem Seiten-Reload aufgerufen — User gibt Passwort ein,
  // Vault Key wird aus localStorage-Daten + Passwort wieder entschlüsselt
  async function unlockVaultKey(password: string) {
    const encryptedVaultKey = localStorage.getItem('hydra_evk')
    const kdfSalt = localStorage.getItem('hydra_kdf_salt')
    if (!encryptedVaultKey || !kdfSalt) throw new Error('Keine gespeicherten Crypto-Daten')

    await initCrypto()
    const keypair = deriveKeypair(password, kdfSalt)
    const key = decryptVaultKey(encryptedVaultKey, keypair.publicKey, keypair.privateKey)
    setVaultKey(key)
  }

  return (
    <AuthContext.Provider value={{ token, userId, role, vaultKey, login, logout, unlockVaultKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}
