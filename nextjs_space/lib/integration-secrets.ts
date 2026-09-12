/**
 * lib/integration-secrets.ts — Entegrasyon secret & config erişim katmanı.
 *
 * Öncelik sırası: veritabanındaki ŞİFRELİ değer → ortam değişkeni (geriye dönük uyum).
 * Çözülmüş değer yalnızca sunucu içi kullanılır; hiçbir API yanıtına konmaz.
 * Kısa ömürlü bellek içi önbellek kullanılır; kaydet/sil işlemlerinde anında geçersiz kılınır.
 */

import prisma from '@/lib/db'
import { encryptSecret, decryptSecret } from '@/lib/crypto-vault'
import { safeError } from '@/lib/log-redact'

const TTL_MS = 60_000
type Entry = { value: string | null; at: number }
const secretCache = new Map<string, Entry>()
const configCache = new Map<string, Entry>()

function k(scope: string, provider: string, field: string) {
  return `${scope}|${provider}|${field}`
}

export function invalidateIntegrationCache(scope?: string, provider?: string) {
  if (!scope) {
    secretCache.clear()
    configCache.clear()
    return
  }
  const prefix = provider ? `${scope}|${provider}|` : `${scope}|`
  Array.from(secretCache.keys()).forEach((key) => { if (key.startsWith(prefix)) secretCache.delete(key) })
  Array.from(configCache.keys()).forEach((key) => { if (provider ? key.startsWith(`${provider}|`) : true) configCache.delete(key) })
}

// ── Secret (şifreli) ────────────────────────────────────────────

export async function getSecret(
  scope: string,
  providerKey: string,
  fieldKey: string,
  envName?: string
): Promise<string | null> {
  const key = k(scope, providerKey, fieldKey)
  const hit = secretCache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  let value: string | null = null
  try {
    const row = await prisma.integrationSecret.findUnique({
      where: { scope_providerKey_fieldKey: { scope, providerKey, fieldKey } },
    })
    if (row) value = decryptSecret(row)
  } catch (e) {
    safeError('integration-secrets', 'secret okuma hatası', e)
  }
  if (!value && envName) {
    const envVal = process.env[envName]
    if (envVal) value = envVal
  }
  secretCache.set(key, { value, at: Date.now() })
  return value
}

export async function hasSecret(scope: string, providerKey: string, fieldKey: string, envName?: string): Promise<boolean> {
  const v = await getSecret(scope, providerKey, fieldKey, envName)
  return !!v && v.length > 0
}

/** Secret'ın nereden geldiğini söyler (değeri değil). */
export async function secretSource(
  scope: string, providerKey: string, fieldKey: string, envName?: string
): Promise<'db' | 'env' | 'none'> {
  try {
    const row = await prisma.integrationSecret.findUnique({
      where: { scope_providerKey_fieldKey: { scope, providerKey, fieldKey } },
      select: { id: true },
    })
    if (row) return 'db'
  } catch { /* yoksay */ }
  if (envName && process.env[envName]) return 'env'
  return 'none'
}

export async function setSecret(
  scope: string, providerKey: string, fieldKey: string, plain: string, updatedBy?: string
): Promise<void> {
  const bundle = encryptSecret(plain)
  await prisma.integrationSecret.upsert({
    where: { scope_providerKey_fieldKey: { scope, providerKey, fieldKey } },
    create: { scope, providerKey, fieldKey, ...bundle, updatedBy: updatedBy ?? null },
    update: { ...bundle, updatedBy: updatedBy ?? null },
  })
  secretCache.delete(k(scope, providerKey, fieldKey))
}

export async function deleteSecret(scope: string, providerKey: string, fieldKey: string): Promise<boolean> {
  try {
    await prisma.integrationSecret.delete({
      where: { scope_providerKey_fieldKey: { scope, providerKey, fieldKey } },
    })
    return true
  } catch {
    return false
  } finally {
    secretCache.delete(k(scope, providerKey, fieldKey))
  }
}

// ── SMS sağlayıcı hassas OLMAYAN config ─────────────────────────

export async function getProviderConfig(providerKey: string, fieldKey: string, envName?: string): Promise<string | null> {
  const key = `${providerKey}|${fieldKey}`
  const hit = configCache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  let value: string | null = null
  try {
    const row = await prisma.smsProviderConfig.findUnique({
      where: { providerKey_fieldKey: { providerKey, fieldKey } },
    })
    if (row) value = row.value
  } catch (e) {
    safeError('integration-secrets', 'config okuma hatası', e)
  }
  if (!value && envName && process.env[envName]) value = process.env[envName] as string
  configCache.set(key, { value, at: Date.now() })
  return value
}

export async function setProviderConfig(providerKey: string, fieldKey: string, value: string): Promise<void> {
  await prisma.smsProviderConfig.upsert({
    where: { providerKey_fieldKey: { providerKey, fieldKey } },
    create: { providerKey, fieldKey, value },
    update: { value },
  })
  configCache.delete(`${providerKey}|${fieldKey}`)
}

export async function deleteProviderConfig(providerKey: string, fieldKey: string): Promise<void> {
  try {
    await prisma.smsProviderConfig.delete({ where: { providerKey_fieldKey: { providerKey, fieldKey } } })
  } catch { /* yoksay */ }
  configCache.delete(`${providerKey}|${fieldKey}`)
}

// ── Genel entegrasyon ayarları (hassas değil) ───────────────────

const settingCache = new Map<string, Entry>()

export async function getIntegrationSetting(key: string, fallback: string): Promise<string> {
  const hit = settingCache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value ?? fallback
  let value: string | null = null
  try {
    const row = await prisma.integrationSetting.findUnique({ where: { key } })
    if (row) value = row.value
  } catch { /* yoksay */ }
  settingCache.set(key, { value, at: Date.now() })
  return value ?? fallback
}

export async function setIntegrationSetting(key: string, value: string): Promise<void> {
  await prisma.integrationSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
  settingCache.delete(key)
}

export function invalidateIntegrationSettings() {
  settingCache.clear()
}
