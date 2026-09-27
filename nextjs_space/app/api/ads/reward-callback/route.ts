import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json'

type VerifierKey = { keyId: number | string; pem: string; base64: string }

let keyCache: { at: number; keys: Map<string, string> } | null = null

async function getVerifierKey(keyId: string): Promise<string | null> {
  const now = Date.now()
  if (!keyCache || now - keyCache.at > 6 * 60 * 60 * 1000 || !keyCache.keys.has(keyId)) {
    try {
      const res = await fetch(VERIFIER_KEYS_URL, { cache: 'no-store' })
      if (!res.ok) return keyCache?.keys.get(keyId) ?? null
      const json = (await res.json()) as { keys: VerifierKey[] }
      const map = new Map<string, string>()
      for (const k of json.keys || []) map.set(String(k.keyId), k.pem)
      keyCache = { at: now, keys: map }
    } catch {
      return keyCache?.keys.get(keyId) ?? null
    }
  }
  return keyCache.keys.get(keyId) ?? null
}

/**
 * Google AdMob Server-Side Verification (SSV) callback.
 * Google sends a signed GET request after a user finishes a rewarded ad.
 * Must always answer with HTTP 200 when the request is accepted.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams

    const signature = q.get('signature')
    const keyId = q.get('key_id')

    // AdMob konsolundaki "URL'yi doğrula" adımı imzasız da deneyebilir → 200 dön.
    if (!signature || !keyId) {
      return new NextResponse('OK', { status: 200 })
    }

    // İmzalanan içerik: query string'in &signature= öncesindeki tüm kısmı
    const raw = url.search.startsWith('?') ? url.search.slice(1) : url.search
    const idx = raw.indexOf('signature=')
    if (idx <= 0) {
      console.warn('AdMob SSV: signature parametresi bulunamadı')
      return new NextResponse('OK', { status: 200 })
    }
    const signedData = raw.substring(0, idx - 1) // sondaki & karakterini at

    const pem = await getVerifierKey(keyId)
    if (!pem) {
      console.warn('AdMob SSV: bilinmeyen key_id', keyId)
      return new NextResponse('OK', { status: 200 })
    }

    const sigBuf = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const verified = crypto
      .createVerify('SHA256')
      .update(signedData, 'utf8')
      .verify(pem, sigBuf)

    if (!verified) {
      // Doğrulanmayan istekte ödül yazılmaz ama AdMob'un doğrulama yoklaması
      // 200 dışı her yanıtı hata sayıyor → 200 dön, sadece logla.
      console.warn('AdMob SSV: imza doğrulanamadı')
      return new NextResponse('OK', { status: 200 })
    }

    const transactionId = q.get('transaction_id')
    if (!transactionId) {
      return new NextResponse('OK', { status: 200 })
    }

    const userId = q.get('user_id')
    const rewardAmount = parseInt(q.get('reward_amount') || '0', 10) || 0

    // Idempotent: aynı transaction ikinci kez ödül vermez
    const existing = await prisma.adRewardGrant.findUnique({ where: { transactionId } })
    if (existing) {
      return new NextResponse('OK', { status: 200 })
    }

    // Bakiye BURADA yüklenmez: uygulama reklam bitince /api/user/watch-ad ile zaten
    // CFC yüklüyor. Bu uç yalnızca Google imzalı izlenme kaydını (denetim) tutar;
    // aksi halde kullanıcı aynı reklam için iki kez ödül alırdı.
    const granted = false

    await prisma.adRewardGrant.create({
      data: {
        transactionId,
        userId: userId || null,
        adNetwork: q.get('ad_network'),
        adUnit: q.get('ad_unit'),
        rewardItem: q.get('reward_item'),
        rewardAmount,
        customData: q.get('custom_data'),
        granted,
      },
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('AdMob SSV callback error:', error)
    // Google 200 dışı yanıtı başarısızlık sayıp tekrar dener; sessizce 200 dön.
    return new NextResponse('OK', { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { Allow: 'GET, POST, HEAD, OPTIONS' },
  })
}
