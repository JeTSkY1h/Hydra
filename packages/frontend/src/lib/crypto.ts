import sodium from 'libsodium-wrappers-sumo'

// libsodium muss einmal initialisiert werden bevor es benutzt werden kann
export async function initCrypto() {
  await sodium.ready
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

// Bytes → Base64 String (zum Speichern auf dem Server)
export function toBase64(bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING)
}

// Base64 String → Bytes
export function fromBase64(str: string): Uint8Array {
  return sodium.from_base64(str, sodium.base64_variants.URLSAFE_NO_PADDING)
}

// ─── Schicht 3: Key Derivation ────────────────────────────────────────────────
// Aus Passwort + Salt wird ein deterministisches Keypair abgeleitet.
// "Deterministisch" bedeutet: gleiche Eingabe → immer gleicher Output.
// Das Keypair verlässt nie den Browser.

export function generateKdfSalt(): string {
  // Zufälliger Salt, wird einmal bei Registrierung erstellt und auf dem Server gespeichert.
  // Nicht geheim — aber ohne ihn kann man aus dem Passwort nicht denselben Key ableiten.
  return toBase64(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES))
}

export function deriveKeypair(password: string, kdfSaltB64: string) {
  const salt = fromBase64(kdfSaltB64)

  // Argon2id: aus Passwort + Salt → 32 Byte Seed
  // crypto_box_SEEDBYTES = 32
  const seed = sodium.crypto_pwhash(
    sodium.crypto_box_SEEDBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, // Rechenaufwand
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE, // Speicheraufwand
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  )

  // Aus dem Seed ein Keypair ableiten
  // publicKey: darf auf dem Server gespeichert werden
  // privateKey: verlässt nie den Browser
  return sodium.crypto_box_seed_keypair(seed)
}

// ─── Schicht 1 + 2: Vault Key ─────────────────────────────────────────────────

export function generateVaultKey(): Uint8Array {
  // Zufälliger 32-Byte Schlüssel — verschlüsselt alle App-Daten
  return sodium.crypto_secretbox_keygen()
}

export function encryptVaultKey(vaultKey: Uint8Array, publicKey: Uint8Array): string {
  // crypto_box_seal: verschlüsselt mit Public Key, nur Private Key kann entschlüsseln.
  // "seal" = anonym — der Absender ist nicht bekannt (kein Problem hier).
  return toBase64(sodium.crypto_box_seal(vaultKey, publicKey))
}

export function decryptVaultKey(encryptedVaultKeyB64: string, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const encrypted = fromBase64(encryptedVaultKeyB64)
  const vaultKey = sodium.crypto_box_seal_open(encrypted, publicKey, privateKey)
  if (!vaultKey) throw new Error('Vault Key konnte nicht entschlüsselt werden')
  return vaultKey
}

// ─── Invite: Vault Key mit Token ver- und entschlüsseln ───────────────────────
// Das Token (32 Bytes hex) wird als symmetrischer Schlüssel verwendet.
// So kann der einladende User den Vault Key im Invite hinterlegen ohne
// dass der neue User schon ein Keypair hat.

export function encryptVaultKeyForInvite(vaultKey: Uint8Array, inviteToken: string): string {
  // Token (hex) → 32 Bytes → als secretbox-Schlüssel verwenden
  const tokenBytes = fromHex(inviteToken)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = sodium.crypto_secretbox_easy(vaultKey, nonce, tokenBytes)

  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce)
  combined.set(ciphertext, nonce.length)
  return toBase64(combined)
}

export function decryptVaultKeyFromInvite(encryptedB64: string, inviteToken: string): Uint8Array {
  const tokenBytes = fromHex(inviteToken)
  const combined = fromBase64(encryptedB64)

  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES)

  const vaultKey = sodium.crypto_secretbox_open_easy(ciphertext, nonce, tokenBytes)
  if (!vaultKey) throw new Error('Invite-Entschlüsselung fehlgeschlagen — Token ungültig?')
  return vaultKey
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

// ─── Daten ver- und entschlüsseln ─────────────────────────────────────────────

export function encrypt(plaintext: string, vaultKey: Uint8Array): string {
  // Jede Verschlüsselung braucht einen einzigartigen Nonce (Number used once).
  // Wird zufällig generiert und zusammen mit dem Ciphertext gespeichert.
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, vaultKey)

  // Nonce + Ciphertext zusammen speichern — nonce wird zum Entschlüsseln gebraucht
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce)
  combined.set(ciphertext, nonce.length)
  return toBase64(combined)
}

export function decrypt(encryptedB64: string, vaultKey: Uint8Array): string {
  const combined = fromBase64(encryptedB64)

  // Nonce und Ciphertext wieder trennen
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES)

  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, vaultKey)
  if (!plaintext) throw new Error('Entschlüsselung fehlgeschlagen')
  return sodium.to_string(plaintext)
}
