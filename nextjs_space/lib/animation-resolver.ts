/**
 * Merkezi Animasyon Cozumleyici (Resolver)
 *
 * Cozumleme onceligi:
 *   ADMIN_CUSTOM > PURCHASE > USER_CUSTOM > EVENT_REWARD
 *   > MEMBERSHIP_DEFAULT > LEGACY (eski kozmetik kayitlar) > NORMAL_DEFAULT
 *
 * Eski sistem korunur: kullanicinin entranceEffectId / profileFrameId /
 * adminAssignedFrameId / nameEffect / chatBubbleId / micFrameId /
 * avatarAccessoryIds alanlari hala okunur ve yeni payload'a donusturulur.
 */

import prisma from '@/lib/db'
import {
  ANIMATION_CATEGORIES,
  ASSIGNMENT_PRIORITY,
  ANIMATION_PRIORITY,
  type AnimationCategory,
} from '@/lib/animation-constants'

export interface AnimationPayload {
  animationId: string
  slug?: string | null
  category: string
  type: string
  assetUrl: string
  thumbnailUrl?: string | null
  soundUrl?: string | null
  durationMs: number
  position: string
  scale: string
  anchor: string
  priority: number
  canSkip: boolean
  cooldownMs: number
  source: string // admin_custom|purchase|user_custom|event_reward|membership_default|legacy
}

function toPayload(a: any, source: string, priorityOverride?: number): AnimationPayload {
  return {
    animationId: a.id,
    slug: a.slug ?? null,
    category: a.category,
    type: a.type,
    assetUrl: a.assetUrl,
    thumbnailUrl: a.thumbnailUrl ?? null,
    soundUrl: a.soundUrl ?? null,
    durationMs: a.durationMs ?? 3000,
    position: a.position ?? 'center',
    scale: a.scale ?? 'medium',
    anchor: a.anchor ?? 'room',
    priority: priorityOverride ?? a.priority ?? 10,
    canSkip: a.canSkip ?? true,
    cooldownMs: a.cooldownMs ?? 0,
    source,
  }
}

function isPlayable(a: any, now: Date): boolean {
  if (!a) return false
  if (a.status !== 'active' && a.status !== 'scheduled') return false
  if (a.activeFrom && new Date(a.activeFrom) > now) return false
  if (a.activeTo && new Date(a.activeTo) < now) return false
  return true
}

function matchesContext(a: any, context?: string | null): boolean {
  if (!context) return true
  const ctx = a.contexts
  if (!ctx) return true
  if (Array.isArray(ctx)) return ctx.length === 0 || ctx.includes(context)
  return true
}

/** Eski kozmetik kaydi -> AnimationPayload */
function legacyPayload(
  id: string,
  category: AnimationCategory,
  assetUrl: string,
  opts: Partial<AnimationPayload> = {}
): AnimationPayload {
  return {
    animationId: `legacy:${category}:${id}`,
    slug: null,
    category,
    type: opts.type ?? 'image',
    assetUrl,
    thumbnailUrl: null,
    soundUrl: null,
    durationMs: opts.durationMs ?? 3000,
    position: opts.position ?? 'center',
    scale: opts.scale ?? 'medium',
    anchor: opts.anchor ?? 'user',
    priority: ASSIGNMENT_PRIORITY.legacy,
    canSkip: true,
    cooldownMs: 0,
    source: 'legacy',
  }
}

export interface ResolveOptions {
  context?: string | null
  categories?: string[] | null
  includeLegacy?: boolean
}

/**
 * Kullanicinin tum kategoriler icin aktif animasyonlarini cozumler.
 * Donen deger: kategori -> payload
 */
export async function resolveUserAnimations(
  userId: string,
  options: ResolveOptions = {}
): Promise<Record<string, AnimationPayload>> {
  const now = new Date()
  const includeLegacy = options.includeLegacy !== false
  const wanted = options.categories?.length
    ? options.categories
    : (ANIMATION_CATEGORIES as readonly string[])

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      membership: true,
      entranceEffectId: true,
      profileFrameId: true,
      adminAssignedFrameId: true,
      nameEffect: true,
      chatBubbleId: true,
      micFrameId: true,
      avatarAccessoryIds: true,
    },
  })
  if (!user) return {}

  const tier = (user.membership || 'basic').toLowerCase()
  const result: Record<string, AnimationPayload> = {}
  const bestScore: Record<string, number> = {}

  const consider = (payload: AnimationPayload, score: number) => {
    if (!wanted.includes(payload.category)) return
    const current = bestScore[payload.category] ?? -1
    if (score > current) {
      bestScore[payload.category] = score
      result[payload.category] = payload
    }
  }

  // 1) Kisisel atamalar (admin_custom / purchase / user_custom / event_reward)
  const assignments = await prisma.animationAssignment.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    include: { animation: true },
    orderBy: { priority: 'desc' },
  })

  for (const asg of assignments) {
    const a = asg.animation
    if (!isPlayable(a, now)) continue
    if (!matchesContext(a, options.context)) continue
    if (asg.context && options.context && asg.context !== options.context) continue
    const base = ASSIGNMENT_PRIORITY[asg.assignmentType] ?? 40
    consider(toPayload(a, asg.assignmentType, base), base + (asg.priority ?? 0) / 1000)
  }

  // 2) Uyelik varsayilanlari
  const defaults = await prisma.animationMembershipDefault.findMany({
    where: { membershipTier: tier, isActive: true },
    include: { animation: true },
  })
  for (const d of defaults) {
    const a = d.animation
    if (!isPlayable(a, now)) continue
    if (!matchesContext(a, options.context)) continue
    consider(
      toPayload(a, 'membership_default', ANIMATION_PRIORITY[tier] ?? 10),
      ASSIGNMENT_PRIORITY.membership_default
    )
  }

  // 3) Eski kozmetik kayitlar (geriye uyumluluk)
  if (includeLegacy) {
    const legacy = await resolveLegacyAnimations(user)
    for (const p of legacy) consider(p, ASSIGNMENT_PRIORITY.legacy)
  }

  return result
}

/** Kullanicinin eski kozmetik secimlerini payload'a cevirir */
async function resolveLegacyAnimations(user: any): Promise<AnimationPayload[]> {
  const out: AnimationPayload[] = []

  const frameId = user.adminAssignedFrameId || user.profileFrameId
  const [entrance, frame, bubble, mic, accessory] = await Promise.all([
    user.entranceEffectId
      ? prisma.entranceEffect.findUnique({ where: { id: user.entranceEffectId } })
      : null,
    frameId ? prisma.profileFrame.findUnique({ where: { id: frameId } }) : null,
    user.chatBubbleId
      ? prisma.chatBubbleSkin.findUnique({ where: { id: user.chatBubbleId } })
      : null,
    user.micFrameId ? prisma.micFrame.findUnique({ where: { id: user.micFrameId } }) : null,
    (() => {
      const ids = parseIdList(user.avatarAccessoryIds)
      return ids.length
        ? prisma.avatarAccessory.findFirst({ where: { id: ids[0], isActive: true } })
        : null
    })(),
  ])

  if (entrance?.isActive) {
    out.push(
      legacyPayload(entrance.id, 'entrance', entrance.assetUrl, {
        type: entrance.assetType || 'lottie',
        durationMs: entrance.durationMs ?? 3000,
        anchor: 'room',
      })
    )
  }
  if (frame?.isActive) {
    out.push(legacyPayload(frame.id, 'profile_frame', frame.imageUrl, { anchor: 'user' }))
  }
  if (bubble?.isActive) {
    out.push(legacyPayload(bubble.id, 'chat_bubble', bubble.assetUrl, { anchor: 'user' }))
  }
  if (mic?.isActive) {
    out.push(legacyPayload(mic.id, 'microphone', mic.assetUrl, { anchor: 'seat' }))
  }
  if (accessory?.isActive) {
    out.push(legacyPayload(accessory.id, 'avatar', accessory.assetUrl, { anchor: 'user' }))
  }

  return out
}

function parseIdList(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string')
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
      } catch {
        return []
      }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

/** Tek kategori icin cozumleme */
export async function resolveUserAnimation(
  userId: string,
  category: string,
  context?: string | null
): Promise<AnimationPayload | null> {
  const map = await resolveUserAnimations(userId, { context, categories: [category] })
  return map[category] ?? null
}

/** Oynatma logu (best-effort, hata yutulur) */
export async function logAnimationPlayback(params: {
  userId?: string | null
  animationId: string
  roomId?: string | null
  context?: string | null
}): Promise<void> {
  try {
    if (params.animationId.startsWith('legacy:')) return
    await prisma.animationPlaybackLog.create({
      data: {
        userId: params.userId ?? null,
        animationId: params.animationId,
        roomId: params.roomId ?? null,
        context: params.context ?? null,
      },
    })
  } catch {
    // sessizce yut - log kritik degil
  }
}
