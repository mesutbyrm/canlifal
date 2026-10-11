/**
 * SAHTE (BONUS) JETON — kaynak çözümleme
 *
 * Platformda iki ayrı jeton havuzu vardır:
 *  • GERÇEK jeton  (users.jetonBalance)      → harcandığında kar/zarara işler,
 *    alıcıya gerçek bakiye olarak geçer, paraya çevrilebilir/çekilebilir.
 *  • SAHTE jeton   (users.fakeJetonBalance)  → yalnızca yönetici yükler.
 *    Harcandığında kar/zarar ve ledger kaydı OLUŞMAZ, alıcıya gerçek bakiye
 *    olarak GEÇMEZ, paraya çevrilemez ve çekilemez. Puan/XP/sıralama
 *    etkileri normal şekilde işler.
 *
 * Kullanıcının sahte jetonu varsa istemci harcama anında "sahte mi gerçek mi?"
 * diye sorar ve seçimi istek gövdesinde `jetonSource: 'real' | 'fake'` olarak
 * gönderir. Seçim gelmezse varsayılan davranış korunur (personel → sahte,
 * normal kullanıcı → gerçek).
 */

import prisma from '@/lib/db'
import type { JetonSource } from '@/lib/balance-guard'

export type { JetonSource }

/** Jeton harcaması kar/zarara işlemeyen roller (sınırsız bakiye). */
const STAFF_ROLES = ['admin', 'yonetici']

/** İstek gövdesinden gelen serbest metni güvenli şekilde kaynağa çevirir. */
export function parseJetonSource(raw: unknown): JetonSource | undefined {
  if (typeof raw !== 'string') return undefined
  const v = raw.trim().toLowerCase()
  if (v === 'fake' || v === 'sahte' || v === 'bonus') return 'fake'
  if (v === 'real' || v === 'gercek' || v === 'gerçek') return 'real'
  return undefined
}

export interface JetonSpendPlan {
  /** Hangi havuzdan düşülecek. */
  source: JetonSource
  /** Kullanıcı admin/yönetici mi (sınırsız bakiye). */
  isStaff: boolean
  /** true ise hiç düşüm yapılmaz (personelin sahte harcaması = sınırsız). */
  skipDeduction: boolean
  /** false ise ledger/kar-zarar yazılmaz ve alıcıya gerçek bakiye geçmez. */
  countsAsFinance: boolean
  realBalance: number
  fakeBalance: number
}

/**
 * Harcama planını çözer. Yetersiz bakiye durumunda burada hata fırlatılmaz —
 * atomik düşüm (atomicDebitJeton) zaten işlemi geri alır.
 */
export async function resolveJetonSpend(
  userId: string,
  amount: number,
  requested?: JetonSource,
): Promise<JetonSpendPlan> {
  let role = 'user'
  let realBalance = 0
  let fakeBalance = 0
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, jetonBalance: true, fakeJetonBalance: true },
    })
    role = u?.role ?? 'user'
    realBalance = u?.jetonBalance ?? 0
    fakeBalance = (u as any)?.fakeJetonBalance ?? 0
  } catch {
    /* bakiye okunamazsa varsayılanlarla devam */
  }

  const isStaff = STAFF_ROLES.includes(role)

  let source: JetonSource
  if (requested) {
    source = requested
  } else if (isStaff) {
    // Geriye dönük uyumluluk: personel harcamaları eskiden de kar/zarara işlemiyordu.
    source = 'fake'
  } else {
    source = 'real'
  }

  // Normal kullanıcı sahte seçti ama sahte bakiyesi yetmiyorsa gerçeğe düşme —
  // atomik düşüm "yetersiz bakiye" hatası vererek işlemi iptal eder.
  const skipDeduction = isStaff && source === 'fake'

  return {
    source,
    isStaff,
    skipDeduction,
    countsAsFinance: source === 'real',
    realBalance,
    fakeBalance,
  }
}

/** Kullanıcının seçim ekranı için iki bakiyesi. */
export async function getJetonBalances(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, jetonBalance: true, fakeJetonBalance: true },
  })
  const isStaff = STAFF_ROLES.includes(u?.role ?? 'user')
  const fake = (u as any)?.fakeJetonBalance ?? 0
  return {
    jetonBalance: u?.jetonBalance ?? 0,
    fakeJetonBalance: fake,
    isStaff,
    /** true ise istemci harcamadan önce "sahte mi gerçek mi?" sormalıdır. */
    mustChooseSource: isStaff || fake > 0,
  }
}
