import jwt from 'jsonwebtoken'
import { getSecret, getProviderConfig } from '@/lib/integration-secrets'

/**
 * ---------------------------------------------------------------------------
 * Google Play satın alma doğrulaması (sunucu tarafı)
 * ---------------------------------------------------------------------------
 * Flutter istemcisi ASLA "ödedim" diyemez. Akış:
 *   Flutter -> Play satın alma -> purchaseToken -> backend
 *   backend -> Google Play Developer API doğrulaması
 *   backend -> transaction + cüzdan güncellemesi
 *
 * Yapılandırma (.env):
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = servis hesabı JSON'u (tek satır)
 *   GOOGLE_PLAY_PACKAGE_NAME         = com.ornek.canlifal
 *
 * Değişkenler yoksa doğrulama `not_configured` döner; bakiye ASLA yüklenmez.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'

export type PlayVerifyResult =
  | { ok: true; raw: any; orderId?: string; purchaseState: number; acknowledged: boolean; isSubscription: boolean; expiryTimeMillis?: string }
  | { ok: false; reason: 'not_configured' | 'auth_failed' | 'invalid_token' | 'api_error'; detail?: string }

/** Servis hesabı JSON'u: önce şifreli yapılandırma deposu, sonra ortam değişkeni. */
export async function getPlayServiceAccountJson(): Promise<string | null> {
  return getSecret('google_play', 'google_play', 'service_account_json', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')
}

/** Paket adı gizli bilgi değildir ancak aynı depodan yönetilir. */
export async function getPlayPackageName(): Promise<string | null> {
  return getProviderConfig('google_play', 'package_name', 'GOOGLE_PLAY_PACKAGE_NAME')
}

export async function isPlayBillingConfigured(): Promise<boolean> {
  const [sa, pkg] = await Promise.all([getPlayServiceAccountJson(), getPlayPackageName()])
  return !!(sa && pkg)
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token
  }
  const rawJson = await getPlayServiceAccountJson()
  if (!rawJson) return null
  let sa: any
  try {
    sa = JSON.parse(rawJson)
  } catch {
    return null
  }
  if (!sa.client_email || !sa.private_key) return null

  const now = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
    { algorithm: 'RS256' }
  )

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) return null
  const data: any = await res.json()
  if (!data.access_token) return null
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
  return data.access_token
}

/**
 * Google Play'de bir satın almayı doğrular.
 * @param productId  Play konsolundaki ürün kimliği
 * @param purchaseToken Play'den dönen token
 * @param type 'product' (tek seferlik) | 'subscription'
 */
export async function verifyGooglePlayPurchase(
  productId: string,
  purchaseToken: string,
  type: 'product' | 'subscription' = 'product'
): Promise<PlayVerifyResult> {
  if (!(await isPlayBillingConfigured())) return { ok: false, reason: 'not_configured' }

  const accessToken = await getAccessToken()
  if (!accessToken) return { ok: false, reason: 'auth_failed' }

  const pkg = encodeURIComponent((await getPlayPackageName()) || '')
  const pid = encodeURIComponent(productId)
  const tok = encodeURIComponent(purchaseToken)
  const url =
    type === 'subscription'
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptions/${pid}/tokens/${tok}`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${pid}/tokens/${tok}`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (res.status === 404 || res.status === 400) {
    return { ok: false, reason: 'invalid_token', detail: `HTTP ${res.status}` }
  }
  if (!res.ok) {
    return { ok: false, reason: 'api_error', detail: `HTTP ${res.status}` }
  }
  const raw: any = await res.json()

  if (type === 'subscription') {
    const active = raw.expiryTimeMillis ? Number(raw.expiryTimeMillis) > Date.now() : false
    return {
      ok: true,
      raw,
      orderId: raw.orderId,
      purchaseState: active ? 0 : 1,
      acknowledged: raw.acknowledgementState === 1,
      isSubscription: true,
      expiryTimeMillis: raw.expiryTimeMillis,
    }
  }

  // purchaseState: 0 = satın alındı, 1 = iptal, 2 = beklemede
  return {
    ok: true,
    raw,
    orderId: raw.orderId,
    purchaseState: typeof raw.purchaseState === 'number' ? raw.purchaseState : 1,
    acknowledged: raw.acknowledgementState === 1,
    isSubscription: false,
  }
}

/** Satın almayı Play tarafında onaylar (acknowledge). Zorunludur; aksi halde iade edilir. */
export async function acknowledgeGooglePlayPurchase(
  productId: string,
  purchaseToken: string,
  type: 'product' | 'subscription' = 'product'
): Promise<boolean> {
  if (!(await isPlayBillingConfigured())) return false
  const accessToken = await getAccessToken()
  if (!accessToken) return false
  const pkg = encodeURIComponent((await getPlayPackageName()) || '')
  const pid = encodeURIComponent(productId)
  const tok = encodeURIComponent(purchaseToken)
  const url =
    type === 'subscription'
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptions/${pid}/tokens/${tok}:acknowledge`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${pid}/tokens/${tok}:acknowledge`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return res.ok
}
