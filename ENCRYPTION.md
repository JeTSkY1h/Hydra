# Hydra — Verschlüsselungsarchitektur

Hydra verwendet ein **Zero-Knowledge**-Modell: alle Nutzdaten werden im Browser verschlüsselt, bevor sie den Server erreichen. Der Server speichert ausschließlich verschlüsselte Blobs und kann deren Inhalt nicht lesen.

---

## Überblick: 3-Schichten-Modell

```
Passwort + KDF-Salt
       │
       ▼  Argon2id
  Keypair (Ed25519 / X25519)
  ├── Public Key  → Server (gespeichert, nicht geheim)
  └── Private Key → niemals gespeichert, nur im RAM
       │
       ▼  crypto_box_seal (X25519 + XSalsa20-Poly1305)
  Vault Key (verschlüsselt)  → Server gespeichert
       │
       ▼  crypto_secretbox (XSalsa20-Poly1305)
  App-Daten (verschlüsselt)  → Server gespeichert
```

---

## Schicht 1 — Datenverschlüsselung

**Algorithmus:** `crypto_secretbox_easy` (XSalsa20-Poly1305)

Alle App-Daten (Transaktionen, Produkte, Kategorien usw.) werden als JSON serialisiert und mit diesem Algorithmus verschlüsselt.

- **Schlüssel:** Vault Key (32 Byte, zufällig)
- **Nonce:** 24 Byte, kryptografisch zufällig, pro Verschlüsselungsvorgang neu generiert
- **Authentifizierung:** Poly1305 MAC — stellt sicher, dass der Ciphertext nicht manipuliert wurde
- **Format auf dem Server:** `Base64(Nonce || Ciphertext)`

```
encrypt(plaintext):
  nonce = random(24 Byte)
  ciphertext = XSalsa20-Poly1305(plaintext, nonce, vaultKey)
  return Base64(nonce || ciphertext)
```

---

## Schicht 2 — Vault Key Schutz

**Algorithmus:** `crypto_box_seal` (X25519 + XSalsa20-Poly1305)

Der Vault Key wird nicht im Klartext gespeichert, sondern mit dem Public Key des jeweiligen Users verschlüsselt. Nur der zugehörige Private Key kann ihn entschlüsseln.

- **Empfänger-Public-Key:** X25519 (32 Byte), liegt auf dem Server
- **Ephemeral Keypair:** wird von libsodium intern erzeugt und weggeworfen
- **Sender-Anonymität:** `seal` erzeugt anonyme Verschlüsselung — der Absender ist nicht identifizierbar
- **Format auf dem Server:** `Base64(crypto_box_seal(vaultKey, publicKey))`

Da der Private Key nie gespeichert wird (nur im RAM nach Login), kann der Server den Vault Key selbst mit Zugriff auf die Datenbank nicht entschlüsseln.

---

## Schicht 3 — Key Derivation

**Algorithmus:** Argon2id

Beim Login wird aus dem Passwort deterministisch ein Keypair abgeleitet — d.h. das Keypair wird nie gespeichert, sondern bei jedem Login neu berechnet.

- **Input:** Passwort (UTF-8) + KDF-Salt (32 Byte)
- **Output:** 32-Byte Seed → X25519/Ed25519-Keypair
- **Parameter (INTERACTIVE-Profil):**
  - `OPSLIMIT_INTERACTIVE` — ca. 2–3 Rechenoperationen
  - `MEMLIMIT_INTERACTIVE` — 64 MB RAM
- **KDF-Salt:** zufällig bei Registrierung generiert, auf dem Server gespeichert (nicht geheim, aber notwendig für Reproduzierbarkeit)

```
deriveKeypair(password, kdfSalt):
  seed = Argon2id(password, kdfSalt, opslimit, memlimit)  // → 32 Byte
  return crypto_box_seed_keypair(seed)  // → { publicKey, privateKey }
```

Der Private Key verlässt den Browser nie. Nach dem Seitenschließen oder Reload ist er weg — deshalb gibt es den UnlockOverlay, der das Keypair und den Vault Key bei Bedarf neu ableitet.

---

## Invite-System

**Algorithmus:** `crypto_secretbox_easy` (XSalsa20-Poly1305)

Wenn ein neuer User eingeladen wird, hat er noch kein Keypair. Der Vault Key wird deshalb mit dem Invite-Token als symmetrischem Schlüssel verschlüsselt.

```
Einladender:
  inviteToken = random(32 Byte) als Hex-String
  nonce = random(24 Byte)
  encryptedVaultKey = XSalsa20-Poly1305(vaultKey, nonce, inviteToken)
  → Token + encryptedVaultKey auf Server speichern

Neuer User (bei Registrierung):
  vaultKey = XSalsa20-Poly1305-Decrypt(encryptedVaultKey, nonce, inviteToken)
  → vaultKey mit eigenem Public Key neu verschlüsseln und auf Server speichern
```

- Das Invite-Token wird nur über den Einladelink übertragen und liegt nicht auf dem Server im Klartext
- Invite-Links sind einmalig verwendbar und laufen nach 7 Tagen ab
- Nach erfolgreicher Registrierung wird der Vault Key ausschließlich mit dem Public Key des neuen Users verschlüsselt gespeichert — das Invite-Token wird danach nicht mehr benötigt

---

## Was der Server weiß

| Datenpunkt | Auf dem Server gespeichert | Lesbar vom Server |
|---|---|---|
| Benutzername | ✓ | ✓ |
| Passwort-Hash | ✓ (Argon2id) | ✗ |
| KDF-Salt | ✓ | ✓ (nicht geheim) |
| Public Key | ✓ | ✓ (nicht geheim) |
| Vault Key | ✓ (verschlüsselt) | ✗ |
| App-Daten | ✓ (verschlüsselt) | ✗ |

---

## Verwendete Bibliothek

**libsodium-wrappers-sumo** — JavaScript-Wrapper für [libsodium](https://doc.libsodium.org/), eine bewährte, auditierte Kryptografie-Bibliothek in C. Die `-sumo`-Variante enthält alle Algorithmen inklusive Argon2id.

Alle kryptografischen Primitive kommen direkt aus libsodium — keine eigenen Implementierungen.

---

## Sicherheitseigenschaften

- **Confidentiality:** AES wird nicht verwendet — XSalsa20 ist eine Stream-Cipher, Poly1305 liefert Authentifizierung (AEAD)
- **Integrity:** Poly1305 MAC erkennt jede Manipulation am Ciphertext
- **Forward Secrecy:** nicht relevant für ruhende Daten (at-rest encryption)
- **Brute-Force-Schutz:** Argon2id mit INTERACTIVE-Parametern macht Passwort-Angriffe rechenintensiv
- **Zufallszahlen:** alle Nonces und Schlüssel werden über `randombytes_buf` (CSPRNG des Betriebssystems) generiert
