import { encrypt, decrypt } from './crypto'

const BASE = '/api/data'

export class AuthExpiredError extends Error {}

function checkAuth(res: Response) {
  if (res.status === 401) throw new AuthExpiredError()
}

type StoredRecord = { id: string; encryptedData: string; createdAt: string; updatedAt: string }

// Alle Einträge einer Tabelle laden und entschlüsseln
export async function fetchAll<T extends { id: string }>(
  table: string,
  token: string,
  vaultKey: Uint8Array
): Promise<T[]> {
  const res = await fetch(`${BASE}/${table}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  checkAuth(res)
  if (!res.ok) throw new Error(`Fehler beim Laden von ${table}`)

  const records: StoredRecord[] = await res.json()
  return records.map((r) => ({
    ...JSON.parse(decrypt(r.encryptedData, vaultKey)),
    id: r.id,
  }))
}

// Neuen Eintrag erstellen
export async function createRecord<T extends { id?: string }>(
  table: string,
  data: Omit<T, 'id'>,
  token: string,
  vaultKey: Uint8Array
): Promise<T & { id: string }> {
  const encryptedData = encrypt(JSON.stringify(data), vaultKey)

  const res = await fetch(`${BASE}/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedData }),
  })
  checkAuth(res)
  if (!res.ok) throw new Error(`Fehler beim Erstellen in ${table}`)

  const stored: StoredRecord = await res.json()
  return { ...data, id: stored.id } as T & { id: string }
}

// Eintrag aktualisieren
export async function updateRecord<T extends { id: string }>(
  table: string,
  data: T,
  token: string,
  vaultKey: Uint8Array
): Promise<T> {
  const { id, ...rest } = data
  const encryptedData = encrypt(JSON.stringify(rest), vaultKey)

  const res = await fetch(`${BASE}/${table}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedData }),
  })
  checkAuth(res)
  if (!res.ok) throw new Error(`Fehler beim Aktualisieren in ${table}`)
  return data
}

// Eintrag löschen
export async function deleteRecord(
  table: string,
  id: string,
  token: string
): Promise<void> {
  const res = await fetch(`${BASE}/${table}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  checkAuth(res)
  if (!res.ok) throw new Error(`Fehler beim Löschen in ${table}`)
}
