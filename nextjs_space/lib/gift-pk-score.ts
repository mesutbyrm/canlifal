/**
 * lib/gift-pk-score.ts — Hediye → PK skoru atfının TEK kanonik yolu.
 *
 * Önceden her hediye ucu kendi `pKBattle.findFirst + update` bloğunu
 * çalıştırıyordu. Bu üç gerçek hataya yol açıyordu:
 *
 *  1. ODA İZOLASYONU YOK — istemci gövdesindeki `battleId` / `streamId` ile
 *     başka bir odanın PK'sına skor yazılabiliyordu.
 *  2. SÜRESİ DOLMUŞ PK — `endsAt` geçmiş ama henüz kapatılmamış bir PK'ya
 *     skor eklenmeye devam ediliyordu.
 *  3. YARIŞ KOŞULU — PK aynı anda biterse skor bitmiş bir kayda yazılıyordu.
 *
 * Bu modül üçünü de kapatır ve skoru her iki tarafa da tek bir kanonik
 * `PK_SCORE` olayı olarak yayınlar (eski istemciler için `action:'score_update'`
 * alanı aynı payload içinde korunur).
 */

import prisma from '@/lib/db'
import { emitPkToBothSides, finishPkBattle } from '@/lib/pk-state'

export type GiftPkScoreResult = {
  battleId: string
  score1: number
  score2: number
  addedAmount: number
  addedSide: 'room1' | 'room2'
  side: 1 | 2
  scoreLogId: string | null
} | null

const SELECT = {
  id: true, status: true, stream1Id: true, stream2Id: true,
  user1Id: true, user2Id: true, score1: true, score2: true, endsAt: true,
} as const

/**
 * Hediye tutarını, gönderildiği yayın/odanın taraf olduğu AKTİF PK'ya ekler.
 *
 * @param sideIds Bu hediyenin ait olduğu tarafın olası kimlikleri
 *                (streamId, stream.roomId, room.id, slug ...). PK'nın
 *                taraflarından biri bu listede yoksa skor YAZILMAZ.
 * @param amount  Eklenecek puan (hediyenin toplam bedeli).
 * @param battleId İstemcinin bildirdiği PK kimliği (opsiyonel, yine de
 *                 `sideIds` ile doğrulanır).
 */
export async function applyGiftPkScore(params: {
  sideIds: (string | null | undefined)[]
  amount: number
  battleId?: string | null
  /** Hediyeyi gönderen kullanıcı (PkScore/PkGift ledger'ı için). */
  contributorId?: string | null
  /** Puanın atfedildiği yayıncı/koltuk sahibi (çok taraflı PK'da katılımcı puanı). */
  receiverId?: string | null
  giftTypeId?: string | null
  quantity?: number | null
  /**
   * Puan kaynağı. `gift_box` ve `bonus_reward` PK skoruna DAHİL EDİLMEZ
   * (Bölüm 22 §17: hediye kutusu ödülü PK skoru üretmez).
   */
  source?: 'gift' | 'gift_box' | 'bonus_reward' | 'manual' | 'battle_bonus'
  /** true ise skor hiç yazılmaz (çağıran taraf açıkça hariç tutar). */
  excludeFromPkScore?: boolean
}): Promise<GiftPkScoreResult> {
  try {
    // ── §17: Hediye kutusu / bonus ödülleri PK skoru üretmez ──
    if (params.excludeFromPkScore) return null
    if (params.source === 'gift_box' || params.source === 'bonus_reward') return null
    const ids = Array.from(
      new Set((params.sideIds || []).filter((v): v is string => typeof v === 'string' && v.length > 0))
    )
    const amount = Math.floor(params.amount || 0)
    if (ids.length === 0 || amount <= 0) return null

    const where: any = params.battleId
      ? { id: params.battleId, status: 'active' }
      : {
          status: 'active',
          OR: [...ids.map((id) => ({ stream1Id: id })), ...ids.map((id) => ({ stream2Id: id }))],
        }

    const battle = await prisma.pKBattle.findFirst({ where, select: SELECT })
    if (!battle) return null

    // ── Oda izolasyonu: hediye gerçekten bu PK'nın bir tarafına mı gitti? ──
    let isSide1 = ids.includes(battle.stream1Id)
    let isSide2 = ids.includes(battle.stream2Id)
    if (!isSide1 && !isSide2) return null

    // ── Aynı oda içi (kullanıcı-vs-kullanıcı) PK: iki taraf da aynı odadır.
    // Taraf, hediyeyi ALAN katılımcıdan türetilir; alıcı PK'nın tarafı değilse
    // skor yazılmaz (odadaki PK dışı kullanıcılara gönderilen hediye sayılmaz).
    if (battle.stream1Id === battle.stream2Id) {
      if (!params.receiverId) return null
      if (params.receiverId === battle.user1Id) {
        isSide1 = true; isSide2 = false
      } else if (params.receiverId === battle.user2Id) {
        isSide1 = false; isSide2 = true
      } else {
        const part = await prisma.pkBattleParticipant.findUnique({
          where: { battleId_userId: { battleId: battle.id, userId: params.receiverId } },
          select: { side: true },
        })
        if (!part) return null
        isSide1 = part.side === 1
        isSide2 = !isSide1
      }
    }

    // ── Süresi dolmuş PK'ya skor yazma; onun yerine kapat ──
    const endsAt = (battle as any).endsAt as Date | null
    if (endsAt && new Date(endsAt).getTime() <= Date.now()) {
      await finishPkBattle(battle as any, 'TIME_UP')
      return null
    }

    // ── Yarış koşulu: yalnızca hâlâ `active` ise arttır ──
    let updated
    try {
      updated = await prisma.pKBattle.update({
        where: { id: battle.id, status: 'active' } as any,
        data: isSide1 ? { score1: { increment: amount } } : { score2: { increment: amount } },
        select: { id: true, score1: true, score2: true },
      })
    } catch {
      // PK bu arada bitmiş — skor yazılmaz, hediye yine de geçerlidir.
      return null
    }

    const side: 1 | 2 = isSide1 ? 1 : 2

    // ── §7: Her skor değişikliği ledger'a yazılır (PkScore + PkGift) ──
    let scoreLogId: string | null = null
    try {
      if (params.contributorId) {
        const log = await prisma.pkScore.create({
          data: { battleId: battle.id, side, contributorId: params.contributorId, points: amount, source: params.source ?? 'gift' },
          select: { id: true },
        })
        scoreLogId = log.id
        if (params.giftTypeId && params.receiverId) {
          await prisma.pkGift.create({
            data: {
              battleId: battle.id,
              side,
              senderId: params.contributorId,
              receiverId: params.receiverId,
              giftTypeId: params.giftTypeId,
              quantity: Math.max(1, Math.floor(params.quantity || 1)),
              points: amount,
            },
          })
        }
      }
      // Çok taraflı PK: puanı alan katılımcının kendi hanesine de yaz
      if (params.receiverId) {
        await prisma.pkBattleParticipant.updateMany({
          where: { battleId: battle.id, userId: params.receiverId },
          data: { points: { increment: amount } },
        })
      }
    } catch (e) {
      console.error('[gift-pk-score] ledger write error:', e)
    }

    const payload = {
      type: 'pk',
      eventType: 'PK_SCORE',
      action: 'score_update', // eski istemciler bu alanı okuyor
      battleId: battle.id,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      score1: updated.score1,
      score2: updated.score2,
      addedAmount: amount,
      addedSide: isSide1 ? 'room1' : 'room2',
      side,
      contributorId: params.contributorId ?? null,
      receiverId: params.receiverId ?? null,
      source: params.source ?? 'gift',
      timestamp: Date.now(),
    }
    emitPkToBothSides(battle, payload)

    return {
      battleId: battle.id,
      score1: updated.score1,
      score2: updated.score2,
      addedAmount: amount,
      addedSide: isSide1 ? 'room1' : 'room2',
      side,
      scoreLogId,
    }
  } catch (e) {
    console.error('[gift-pk-score] applyGiftPkScore error:', e)
    return null
  }
}
