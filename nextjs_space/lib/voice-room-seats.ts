/**
 * BÖLÜM 2 — Dinamik & kademeli koltuk sistemi.
 *
 * Bu modül `lib/voice-room-constants.ts` dosyasının ÜSTÜNE eklenir; eski
 * `SEAT_COUNT` sabiti ve yardımcıları OLDUĞU GİBİ kalır (geriye dönük uyumluluk).
 * Buradaki fonksiyonlar oda bazlı dinamik koltuk sayısını, kademeli koltuk
 * dağılımını ve kademeli "+" açılımını hesaplar.
 *
 * Koltuk kompozisyonu (varsayılan 15 koltuk):
 *   index 0            → oda sahibi (owner)
 *   index 1..10        → misafir (guest)  — normal kullanıcılar
 *   index 11..14       → ayrıcalıklı (privileged) — admin / yönetici / moderatör
 *                        veya Gold ve üzeri üyelikler
 *
 * Koltuk sayısı 15'ten küçükse önce ayrıcalıklı blok, sonra misafir bloğu küçülür.
 */
import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'
import { isPrivilegedRole, membershipRank } from '@/lib/animation-constants'

/** Bir odada olabilecek en fazla koltuk sayısı. */
export const MAX_SEAT_COUNT = 15
/** Bir odada olabilecek en az koltuk sayısı (oda sahibi + 1 misafir). */
export const MIN_SEAT_COUNT = 2
/** Global varsayılan koltuk sayısı (PlatformSettings.vr_seat_count ile değiştirilir). */
export const DEFAULT_SEAT_COUNT = 15
/** Oda sahibinin koltuğu. */
export const OWNER_SEAT_INDEX = 0
/** Normal (misafir) koltuk sayısı üst sınırı. */
export const MAX_GUEST_SEATS = 10
/** Ayrıcalıklı koltuk sayısı üst sınırı. */
export const MAX_PRIVILEGED_SEATS = 4
/** Ayrıcalıklı koltuk için gereken en düşük üyelik kademesi. */
export const PRIVILEGED_MIN_MEMBERSHIP = 'gold'

export const SEAT_SETTING_KEY = 'vr_seat_count'

export type SeatKind = 'owner' | 'guest' | 'privileged'
export type SeatState = 'occupied' | 'open' | 'hidden'

export interface SeatComposition {
  seatCount: number
  ownerSeats: number
  guestSeats: number
  privilegedSeats: number
  /** Misafir bloğunun ilk indeksi (her zaman 1). */
  guestStart: number
  /** Misafir bloğunun son indeksi (dahil). guestSeats=0 ise -1. */
  guestEnd: number
  /** Ayrıcalıklı bloğun ilk indeksi. privilegedSeats=0 ise -1. */
  privilegedStart: number
  /** Ayrıcalıklı bloğun son indeksi (dahil). privilegedSeats=0 ise -1. */
  privilegedEnd: number
}

export function clampSeatCount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return DEFAULT_SEAT_COUNT
  return Math.min(MAX_SEAT_COUNT, Math.max(MIN_SEAT_COUNT, Math.floor(n)))
}

/** Global varsayılan koltuk sayısı (önbellekli platform ayarı). */
export async function getGlobalSeatCount(): Promise<number> {
  const raw = await getCachedPlatformSetting(SEAT_SETTING_KEY, String(DEFAULT_SEAT_COUNT))
  return clampSeatCount(raw)
}

/**
 * Odanın etkin koltuk sayısı: `ChatRoom.seatCount` doluysa o, değilse global
 * varsayılan. Oda kaydı zaten elinizdeyse `override` parametresini geçin ki
 * fazladan sorgu atılmasın.
 */
export async function resolveRoomSeatCount(
  roomId: string,
  override?: number | null | undefined
): Promise<number> {
  if (typeof override === 'number') return clampSeatCount(override)
  if (override === null) return getGlobalSeatCount()
  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { seatCount: true }
    })
    if (room && typeof room.seatCount === 'number') return clampSeatCount(room.seatCount)
  } catch {
    /* yoksay — global varsayılana düş */
  }
  return getGlobalSeatCount()
}

/** Koltuk sayısına göre blok dağılımını hesaplar. */
export function getSeatComposition(seatCount: number): SeatComposition {
  const total = clampSeatCount(seatCount)
  const guestSeats = Math.min(MAX_GUEST_SEATS, total - 1)
  const privilegedSeats = Math.min(MAX_PRIVILEGED_SEATS, total - 1 - guestSeats)
  const guestStart = 1
  const guestEnd = guestSeats > 0 ? guestSeats : -1
  const privilegedStart = privilegedSeats > 0 ? guestSeats + 1 : -1
  const privilegedEnd = privilegedSeats > 0 ? guestSeats + privilegedSeats : -1
  return {
    seatCount: total,
    ownerSeats: 1,
    guestSeats,
    privilegedSeats,
    guestStart,
    guestEnd,
    privilegedStart,
    privilegedEnd
  }
}

/** Bir koltuk indeksinin türü. */
export function seatKind(index: number, seatCount: number): SeatKind {
  const c = getSeatComposition(seatCount)
  if (index === OWNER_SEAT_INDEX) return 'owner'
  if (c.privilegedStart >= 0 && index >= c.privilegedStart && index <= c.privilegedEnd) return 'privileged'
  return 'guest'
}

export interface SeatUserContext {
  userId?: string | null
  /** Global site rolü (users.role). */
  role?: string | null
  /** Üyelik kademesi (users.membership). */
  membership?: string | null
  /** Bu odanın sahibi mi? */
  isRoomOwner?: boolean
  /** Oda içi rol (chat_user_roles.role) — superadmin/founder/sop/op. */
  chatRole?: string | null
}

const PRIVILEGED_CHAT_ROLES = new Set(['superadmin', 'founder', 'sop', 'admin'])

/** Kullanıcı ayrıcalıklı koltuklara oturabilir mi? */
export function canUsePrivilegedSeat(user: SeatUserContext): boolean {
  if (!user) return false
  if (user.isRoomOwner) return true
  if (isPrivilegedRole(user.role || undefined)) return true
  if (user.role && ['site_manager', 'moderator'].includes(user.role)) return true
  if (user.chatRole && PRIVILEGED_CHAT_ROLES.has(user.chatRole)) return true
  if (membershipRank(user.membership || 'basic') >= membershipRank(PRIVILEGED_MIN_MEMBERSHIP)) return true
  return false
}

/** Kullanıcının yetki ağırlığı — ayrıcalıklı koltuklar bu sıraya göre dolar. */
export function seatAuthorityWeight(user: SeatUserContext): number {
  if (!user) return 0
  let w = 0
  if (user.isRoomOwner) w = Math.max(w, 100)
  if (isPrivilegedRole(user.role || undefined)) w = Math.max(w, 90)
  if (user.role === 'site_manager') w = Math.max(w, 85)
  if (user.role === 'moderator') w = Math.max(w, 80)
  if (user.chatRole === 'superadmin') w = Math.max(w, 70)
  if (user.chatRole === 'founder') w = Math.max(w, 65)
  if (user.chatRole === 'sop' || user.chatRole === 'admin') w = Math.max(w, 60)
  if (user.chatRole === 'op') w = Math.max(w, 50)
  w = Math.max(w, membershipRank(user.membership || 'basic'))
  return w
}

/**
 * Kullanıcının oturabileceği ilk boş koltuğu döndürür (yoksa -1).
 *
 * - Oda sahibi → önce 0 numaralı taht, dolu ise ayrıcalıklı, sonra misafir.
 * - Ayrıcalıklı kullanıcı → önce ayrıcalıklı blok, dolu ise misafir bloğu.
 * - Normal kullanıcı → yalnızca misafir bloğu.
 */
export function findFirstFreeSeatFor(
  user: SeatUserContext,
  occupied: Iterable<number>,
  seatCount: number
): number {
  const c = getSeatComposition(seatCount)
  const taken = new Set<number>()
  for (const s of occupied) taken.add(s)

  const guestRange: number[] = []
  for (let i = c.guestStart; i <= c.guestEnd; i++) guestRange.push(i)
  const privRange: number[] = []
  if (c.privilegedStart >= 0) {
    for (let i = c.privilegedStart; i <= c.privilegedEnd; i++) privRange.push(i)
  }

  const order: number[] = []
  if (user?.isRoomOwner) {
    order.push(OWNER_SEAT_INDEX, ...privRange, ...guestRange)
  } else if (canUsePrivilegedSeat(user)) {
    order.push(...privRange, ...guestRange)
  } else {
    order.push(...guestRange)
  }

  for (const i of order) {
    if (!taken.has(i)) return i
  }
  return -1
}

/** Kullanıcı belirtilen koltuğa oturabilir mi (kademe kuralı)? */
export function canSitOnSeat(user: SeatUserContext, index: number, seatCount: number): boolean {
  if (index < 0) return true // dinleyici
  if (index >= clampSeatCount(seatCount)) return false
  const kind = seatKind(index, seatCount)
  if (kind === 'owner') return !!user?.isRoomOwner || canUsePrivilegedSeat(user)
  if (kind === 'privileged') return canUsePrivilegedSeat(user)
  return true
}

export interface SeatLayoutEntry {
  seatIndex: number
  kind: SeatKind
  state: SeatState
  requiresPrivilege: boolean
  occupantId: string | null
}

/**
 * Kademeli "+" açılımı.
 *
 * Kural (kullanıcı isteği): oda boşken yalnızca oda sahibinin koltuğu ve yanında
 * TEK bir "+" görünür. Bir koltuk dolduğunda bir sonraki "+" açılır; bu, odanın
 * koltuk sayısına ulaşana kadar sürer. Ayrıcalıklı koltuklar yalnızca dolu
 * olduklarında görünür (yetkili biri girdiğinde belirirler).
 */
export function buildSeatLayout(
  occupiedIndexes: Iterable<number>,
  seatCount: number,
  occupantByIndex?: Map<number, string>
): { seatCount: number; visibleSeatCount: number; composition: SeatComposition; layout: SeatLayoutEntry[] } {
  const c = getSeatComposition(seatCount)
  const taken = new Set<number>()
  for (const s of occupiedIndexes) {
    if (s >= 0 && s < c.seatCount) taken.add(s)
  }

  // Misafir bloğunda kademeli açılım
  let occupiedGuests = 0
  let highestGuest = -1
  for (let i = c.guestStart; i <= c.guestEnd; i++) {
    if (taken.has(i)) {
      occupiedGuests++
      highestGuest = i
    }
  }
  const revealedGuests = Math.min(
    c.guestSeats,
    Math.max(occupiedGuests + 1, highestGuest >= 0 ? highestGuest - c.guestStart + 2 : 1)
  )
  const guestRevealEnd = c.guestStart + revealedGuests - 1

  const layout: SeatLayoutEntry[] = []
  let visibleSeatCount = 0
  for (let i = 0; i < c.seatCount; i++) {
    const kind = seatKind(i, c.seatCount)
    const isTaken = taken.has(i)
    let state: SeatState
    if (isTaken) {
      state = 'occupied'
    } else if (kind === 'owner') {
      state = 'open'
    } else if (kind === 'guest') {
      state = i <= guestRevealEnd ? 'open' : 'hidden'
    } else {
      // Ayrıcalıklı koltuklar yalnızca doluyken görünür
      state = 'hidden'
    }
    if (state !== 'hidden') visibleSeatCount++
    layout.push({
      seatIndex: i,
      kind,
      state,
      requiresPrivilege: kind === 'privileged',
      occupantId: occupantByIndex?.get(i) ?? null
    })
  }

  return { seatCount: c.seatCount, visibleSeatCount, composition: c, layout }
}
