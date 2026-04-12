import { createContext, useContext, useState, useCallback } from 'react'
import type {
  Category, Product, Transaction, MonthlyCash, Asset, Credit, CreditPayment, AppSettings
} from '@hydra/shared'
import { fetchAll, createRecord, updateRecord, deleteRecord, AuthExpiredError } from '../lib/dataStore'
import { useAuth } from './AuthContext'

type AppData = {
  categories: Category[]
  products: Product[]
  transactions: Transaction[]
  monthlyCashes: MonthlyCash[]
  assets: Asset[]
  credits: Credit[]
  creditPayments: CreditPayment[]
  settings: AppSettings | null
}

type DataContextType = {
  data: AppData
  loading: boolean
  loadAll: () => Promise<void>
  // Generische CRUD-Operationen
  create: <T extends { id?: string }>(table: string, item: Omit<T, 'id'>) => Promise<T & { id: string }>
  update: <T extends { id: string }>(table: string, item: T) => Promise<T>
  remove: (table: string, id: string) => Promise<void>
}

const empty: AppData = {
  categories: [],
  products: [],
  transactions: [],
  monthlyCashes: [],
  assets: [],
  credits: [],
  creditPayments: [],
  settings: null,
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, vaultKey, logout } = useAuth()
  const [data, setData] = useState<AppData>(empty)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  function handleAuthError(err: unknown) {
    if (err instanceof AuthExpiredError) {
      logout()
      window.location.href = '/login'
    } else {
      throw err
    }
  }

  const loadAll = useCallback(async () => {
    if (!token || !vaultKey) return
    if (!initialized) setLoading(true)
    try {
      const [categories, products, transactions, monthlyCashes, assets, credits, creditPayments, settingsArr] =
        await Promise.all([
          fetchAll<Category>('category', token, vaultKey),
          fetchAll<Product>('product', token, vaultKey),
          fetchAll<Transaction>('transaction', token, vaultKey),
          fetchAll<MonthlyCash>('monthlyCash', token, vaultKey),
          fetchAll<Asset>('asset', token, vaultKey),
          fetchAll<Credit>('credit', token, vaultKey),
          fetchAll<CreditPayment>('creditPayment', token, vaultKey),
          fetchAll<AppSettings>('appSettings', token, vaultKey),
        ])

      setData({
        categories,
        products,
        transactions,
        monthlyCashes,
        assets,
        credits,
        creditPayments,
        settings: settingsArr[0] ?? null,
      })
      setInitialized(true)
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }, [token, vaultKey, initialized])

  async function create<T extends { id?: string }>(table: string, item: Omit<T, 'id'>) {
    if (!token || !vaultKey) throw new Error('Nicht eingeloggt')
    try {
      const created = await createRecord<T>(table, item, token, vaultKey)
      await loadAll()
      return created
    } catch (err) { handleAuthError(err); throw err }
  }

  async function update<T extends { id: string }>(table: string, item: T) {
    if (!token || !vaultKey) throw new Error('Nicht eingeloggt')
    try {
      const updated = await updateRecord(table, item, token, vaultKey)
      await loadAll()
      return updated
    } catch (err) { handleAuthError(err); throw err }
  }

  async function remove(table: string, id: string) {
    if (!token) throw new Error('Nicht eingeloggt')
    try {
      await deleteRecord(table, id, token)
      await loadAll()
    } catch (err) { handleAuthError(err); throw err }
  }

  return (
    <DataContext.Provider value={{ data, loading, loadAll, create, update, remove }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData muss innerhalb von DataProvider verwendet werden')
  return ctx
}
