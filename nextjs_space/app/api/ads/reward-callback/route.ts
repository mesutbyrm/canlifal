import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyAdMobSsvQuery } from '@/lib/admob-ssv'

export const dynamic = 'force-dynamic'

/**
 * Google AdMob Server-Side Verification (SSV) callback — ESKİ ADRES.
 * Yeni/önerilen adres: /api/ads/ssv/admob
 *
 * Bu uç geriye dönük uyumluluk için aynen korunur: yalnızca denetim kaydı
 * tutar (granted=false), bakiye yüklemez ve HER durumda 200 döner.
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

    const verification = await verifyAdMobSsvQuery(url.search)
    if (!verification.ok) {
      // Doğrulanmayan istekte kayıt yazılmaz ama bu eski uç her zaman 200 döner.
      console.warn('AdMob SSV (reward-callback): doğrulama başarısız', verification.reason)
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
