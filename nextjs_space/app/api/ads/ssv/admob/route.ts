import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyAdMobSsvQuery } from '@/lib/admob-ssv'
import { grantAdWatchCredits, isSsvGrantEnabled } from '@/lib/ad-reward'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ads/ssv/admob
 *
 * Google AdMob ödüllü reklam Server-Side Verification geri çağırması.
 * Herkese açıktır (oturum/JWT yok); yetki imza doğrulamasıyla sağlanır.
 *
 * Davranış:
 *  - İmza doğrulanamazsa 403.
 *  - İmza geçerliyse her durumda 200 (tekrar eden işlem, bilinmeyen kullanıcı,
 *    limit dolu, iç hata) — AdMob 200 dışı yanıtta isteği tekrar dener.
 *  - Ödül miktarı sunucudaki kurallardan gelir; reward_amount'a güvenilmez.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const q = url.searchParams

  // AdMob konsolundaki "URL'yi doğrula" adımı imzasız bir yoklama gönderir.
  if (!q.get('signature') || !q.get('key_id')) {
    return new NextResponse('OK', { status: 200 })
  }

  const verification = await verifyAdMobSsvQuery(url.search)
  if (!verification.ok) {
    // Teşhis: AdMob konsolu "URL'yi doğrula" hatalarını izleyebilmek için ham sorgu loglanır.
    console.warn(
      'ADMOB_SSV_FAIL reason=%s key_id=%s query=%s',
      verification.reason,
      q.get('key_id'),
      url.search
    )
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'x-ssv-reason': String(verification.reason || 'unknown') },
    })
  }

  // Konsol "URL'yi doğrula" testi: kabul et, ödül verme, kayıt yazma.
  if (verification.isTest) return new NextResponse('OK', { status: 200 })

  try {
    const transactionId = q.get('transaction_id')
    if (!transactionId) return new NextResponse('OK', { status: 200 })

    const userId = q.get('user_id')
    const adNetwork = q.get('ad_network')
    const adUnit = q.get('ad_unit')
    const rewardItem = q.get('reward_item')
    const customData = q.get('custom_data')

    // Tekrar koruması: aynı transaction ikinci kez ödül vermez, yine de 200 döner.
    const existing = await prisma.adRewardGrant.findUnique({ where: { transactionId } })
    if (existing) {
      return new NextResponse('OK', { status: 200 })
    }

    // user_id gerçek bir kullanıcı mı?
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : null

    let granted = false
    let grantedAmount = 0

    if (user && (await isSsvGrantEnabled())) {
      const outcome = await grantAdWatchCredits(user.id)
      if (outcome.status === 'granted') {
        granted = true
        grantedAmount = outcome.creditsEarned
      }
    }

    // Kaydı en sona yazıyoruz; benzersiz transactionId yarış durumunu da kapatır.
    try {
      await prisma.adRewardGrant.create({
        data: {
          transactionId,
          userId: user?.id ?? null,
          adNetwork,
          adUnit,
          rewardItem,
          rewardAmount: grantedAmount,
          customData,
          granted,
        },
      })
    } catch (e: any) {
      // P2002 = eşzamanlı ikinci istek aynı transaction'ı yazdı.
      if (e?.code !== 'P2002') throw e
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('AdMob SSV (/api/ads/ssv/admob) hatası:', error)
    // İmza hatası dışında hata fırlatma: 200 dön ki AdMob gereksiz tekrar denemesin.
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
