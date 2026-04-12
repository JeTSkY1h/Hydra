// ─── App-Typen ────────────────────────────────────────────────────────────────
// Alle Beträge in Cent gespeichert um Fließkomma-Probleme zu vermeiden.
// Beispiel: 19,99 € = 1999

export type Category = {
  id: string
  name: string
}

export type Product = {
  id: string
  name: string
  quantity: number
  buyPrice?: number   // Einkaufspreis in Cent
  categoryId: string
}

export type TransactionType = 'INCOME' | 'EXPENSE'

export type Transaction = {
  id: string
  date: string        // ISO-Datum: "2026-03-06"
  type: TransactionType
  description: string
  quantity?: number
  amountCents: number
  productId?: string  // optional: verknüpftes Produkt im Inventar
  creditId?: string   // optional: Zahlung auf einen Kredit
}

export type MonthlyCash = {
  id: string
  month: number       // 1–12
  year: number
  cashStartCents: number
}

export type Asset = {
  id: string
  name: string
  valueCents: number
}

export type Credit = {
  id: string
  personName: string
  startAmountCents: number
}

export type CreditPayment = {
  id: string
  creditId: string
  date: string
  amountCents: number
}

export type AppSettings = {
  id: string
  memberCount: number
}
