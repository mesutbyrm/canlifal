/**
 * GirLive Bot — sesli oda + canlı yayın için merkezi, sunucu taraflı bot ve
 * moderasyon servisi.
 *
 * - Bot: `isBot` işaretli sistem hesabı (girişi `auth-options` tarafından engellenir).
 *   Mesajları normal ChatMessage / VideoStreamComment olarak yazılır.
 * - Moderasyon: istemciye GÜVENİLMEZ; mesaj POST uçları `moderateMessage`
 *   çağırır. İhlal → mesaj kaydedilmez, ciddiyet + tekrar sayısına göre
 *   uyarı / mute / kick / ban uygulanır, `UserModerationAction` + AuditLog yazılır.
 * - Yetki: bot, oda sahibi / site yöneticisi / oda içi op+ / yayın moderatörü
 *   üzerinde ASLA işlem yapmaz. Yöneticiler botun mute/ban'ını normal
 *   moderasyon uçlarıyla kaldırabilir (yetkileri botunkinden yüksektir).
 * - Ayarlar (admin): SiteSetting `girlive.*` anahtarları.
 */
import prisma from '@/lib/db'
import { getCached, invalidateCache } from '@/lib/cache'
import { emitChatEvent } from '@/lib/chat-events'
import { emitStreamEvent } from '@/lib/stream-events'
import { recordAudit } from '@/lib/audit-log'
import { ROLE_HIERARCHY } from '@/lib/chat-permissions'
import {
  BOT_NAME,
  DEFAULT_BANNED_WORDS,
  DEFAULT_RULES_TEXT,
  DEFAULT_SEVERITY_ACTIONS,
  DEFAULT_WELCOME_TEXT,
  botNoticeFor,
  decideAction,
  detectViolation,
  parseBannedWordEntries,
  parseSeverityActions,
  renderTemplate,
  type BannedWordEntry,
  type ModAction,
  type Severity,
  type SeverityActions,
} from '@/lib/girlive-moderation-core'

export type ModScope = 'voice_room' | 'live_stream'

const BOT_EMAIL = 'girlive-bot@system.canlifal.com'
const GLOBAL_STAFF = ['admin', 'yonetici', 'moderator', 'site_manager']
const PRIOR_WINDOW_MS = 24 * 60 * 60 * 1000
const WELCOME_DEDUPE_MS = 30 * 60 * 1000

// ── Bot hesabı ────────────────────────────────────────────────────────────
let botIdCache: string | null = null

export async function getGirLiveBotId(): Promise<string> {
  if (botIdCache) return botIdCache
  let user
  try {
    user = await prisma.user.upsert({
      where: { email: BOT_EMAIL },
      update: {},
      create: { email: BOT_EMAIL, name: BOT_NAME, username: 'girlive_bot', isBot: true },
      select: { id: true },
    })
  } catch {
    // `girlive_bot` kullanıcı adı başkasında olabilir: kullanıcı adsız oluştur.
    user = await prisma.user.upsert({
      where: { email: BOT_EMAIL },
      update: {},
      create: { email: BOT_EMAIL, name: BOT_NAME, isBot: true },
      select: { id: true },
    })
  }
  botIdCache = user.id
  return user.id
}

// ── Admin ayarları (SiteSetting) ──────────────────────────────────────────
export interface GirLiveConfig {
  enabled: boolean
  welcomeText: string
  rulesText: string
  actions: SeverityActions
  /** Admin'in eklediği kelimeler (varsayılan listeye ek). */
  words: BannedWordEntry[]
  /** Admin'in "güvenli" saydığı kelimeler (yanlış pozitifleri engeller). */
  whitelist: string[]
}

const CONFIG_KEYS = {
  enabled: 'girlive.enabled',
  welcomeText: 'girlive.welcome_text',
  rulesText: 'girlive.rules_text',
  actions: 'girlive.severity_actions',
  words: 'girlive.words',
  whitelist: 'girlive.whitelist',
} as const

function safeJson(raw: string | undefined): unknown {
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export async function getGirLiveConfig(): Promise<GirLiveConfig> {
  return getCached('girlive:config', 30, async () => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'girlive.' } } })
    const m = new Map<string, string>(rows.map((r: { key: string; value: string }) => [r.key, r.value]))
    const whitelistRaw = safeJson(m.get(CONFIG_KEYS.whitelist))
    return {
      enabled: m.get(CONFIG_KEYS.enabled) !== 'false',
      welcomeText: m.get(CONFIG_KEYS.welcomeText) || DEFAULT_WELCOME_TEXT,
      rulesText: m.get(CONFIG_KEYS.rulesText) || DEFAULT_RULES_TEXT,
      actions: parseSeverityActions(safeJson(m.get(CONFIG_KEYS.actions))),
      words: parseBannedWordEntries(safeJson(m.get(CONFIG_KEYS.words))),
      whitelist: Array.isArray(whitelistRaw) ? whitelistRaw.map(String) : [],
    }
  })
}

export async function saveGirLiveConfig(patch: Partial<GirLiveConfig>): Promise<GirLiveConfig> {
  const upsert = (key: string, value: string) =>
    prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  const jobs: Promise<unknown>[] = []
  if (patch.enabled !== undefined) jobs.push(upsert(CONFIG_KEYS.enabled, patch.enabled ? 'true' : 'false'))
  if (patch.welcomeText !== undefined) jobs.push(upsert(CONFIG_KEYS.welcomeText, patch.welcomeText.slice(0, 500)))
  if (patch.rulesText !== undefined) jobs.push(upsert(CONFIG_KEYS.rulesText, patch.rulesText.slice(0, 1000)))
  if (patch.actions !== undefined) jobs.push(upsert(CONFIG_KEYS.actions, JSON.stringify(parseSeverityActions(patch.actions))))
  if (patch.words !== undefined) jobs.push(upsert(CONFIG_KEYS.words, JSON.stringify(parseBannedWordEntries(patch.words).slice(0, 1000))))
  if (patch.whitelist !== undefined) jobs.push(upsert(CONFIG_KEYS.whitelist, JSON.stringify(patch.whitelist.map(String).slice(0, 500))))
  await Promise.all(jobs)
  invalidateCache('girlive:config')
  return getGirLiveConfig()
}

// ── Bot mesajı yazma ──────────────────────────────────────────────────────
export async function postBotMessage(scope: ModScope, scopeId: string, content: string): Promise<void> {
  try {
    const botId = await getGirLiveBotId()
    if (scope === 'voice_room') {
      const message = await prisma.chatMessage.create({
        data: { roomId: scopeId, userId: botId, content },
        include: { user: { select: { id: true, name: true, image: true, role: true, membership: true } } },
      })
      emitChatEvent(scopeId, 'message', { ...message, user: { ...message.user, chatRole: null, roleSymbol: '' } })
    } else {
      const comment = await prisma.videoStreamComment.create({
        data: { streamId: scopeId, userId: botId, content },
        include: { user: { select: { name: true, image: true, role: true, membership: true } } },
      })
      emitStreamEvent(scopeId, 'streamMessage', {
        type: 'streamMessage',
        streamId: scopeId,
        message: { ...comment, user: { ...comment.user, id: botId } },
      })
    }
  } catch (e) {
    // Bot mesajı asla birincil işlemi bozmamalı.
    console.error('[GirLive] bot mesajı yazılamadı:', e)
  }
}

async function displayName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } })
  return u?.username || u?.name || 'kullanıcı'
}

// ── Hoş geldin + kurallar ─────────────────────────────────────────────────
const welcomeSeen = new Map<string, number>()

/**
 * Odaya/yayına (taze) giren kullanıcıyı karşılar. Aynı kullanıcı için
 * 30 dk içinde tekrar mesaj yazmaz (bellek + veritabanı kontrolü → spam yok).
 * Kurallar herkese açık sohbete YAZILMAZ: yalnızca girene yönelik
 * `girlive_rules` oda olayı gönderilir (sesli oda SSE).
 */
export async function welcomeUser(scope: ModScope, scopeId: string, userId: string): Promise<void> {
  try {
    const cfg = await getGirLiveConfig()
    if (!cfg.enabled) return
    const botId = await getGirLiveBotId()
    if (userId === botId) return

    const key = `${scope}:${scopeId}:${userId}`
    const now = Date.now()
    const last = welcomeSeen.get(key)
    if (last && now - last < WELCOME_DEDUPE_MS) return
    welcomeSeen.set(key, now)
    if (welcomeSeen.size > 5000) {
      for (const [k, t] of welcomeSeen) if (now - t > WELCOME_DEDUPE_MS) welcomeSeen.delete(k)
    }

    const name = await displayName(userId)
    const since = new Date(now - WELCOME_DEDUPE_MS)
    const marker = `Hoş geldin @${name}`
    const dup =
      scope === 'voice_room'
        ? await prisma.chatMessage.findFirst({
            where: { roomId: scopeId, userId: botId, createdAt: { gte: since }, content: { contains: marker } },
            select: { id: true },
          })
        : await prisma.videoStreamComment.findFirst({
            where: { streamId: scopeId, userId: botId, createdAt: { gte: since }, content: { contains: marker } },
            select: { id: true },
          })
    if (dup) return

    await postBotMessage(scope, scopeId, renderTemplate(cfg.welcomeText, name))
    if (scope === 'voice_room') {
      emitChatEvent(scopeId, 'room', {
        event: 'girlive_rules',
        roomId: scopeId,
        targetUserId: userId,
        text: cfg.rulesText,
        ts: now,
      })
    }
  } catch (e) {
    console.error('[GirLive] hoş geldin başarısız:', e)
  }
}

// ── Moderasyon ────────────────────────────────────────────────────────────
export interface ModerationResult {
  /** false → mesaj kaydedilmemeli. */
  allowed: boolean
  verdict: 'allowed' | 'warning' | 'mute' | 'kick' | 'ban'
  severity?: Severity
  word?: string
  /** İstemciye gösterilecek kısa Türkçe açıklama. */
  message?: string
}

const ALLOWED: ModerationResult = { allowed: true, verdict: 'allowed' }

interface Target {
  ownerId?: string | null
  customWords: string[]
  whitelist: string[]
  autoModeration: boolean
}

async function loadTarget(scope: ModScope, scopeId: string): Promise<Target | null> {
  if (scope === 'voice_room') {
    const room = await prisma.chatRoom.findUnique({
      where: { id: scopeId },
      select: { ownerId: true, bannedWords: true, whitelistedWords: true, autoModeration: true },
    })
    if (!room) return null
    const parse = (raw: string | null) => {
      try {
        const v = raw ? JSON.parse(raw) : []
        return Array.isArray(v) ? v.map(String) : []
      } catch {
        return []
      }
    }
    return {
      ownerId: room.ownerId,
      customWords: parse(room.bannedWords),
      whitelist: parse(room.whitelistedWords),
      autoModeration: room.autoModeration !== false,
    }
  }
  const stream = await prisma.videoStream.findUnique({ where: { id: scopeId }, select: { userId: true } })
  if (!stream) return null
  return { ownerId: stream.userId, customWords: [], whitelist: [], autoModeration: true }
}

/** Bot bu kullanıcıya dokunmamalı mı? (sahip, site yöneticisi, oda op+, yayın moderatörü) */
async function isExempt(scope: ModScope, scopeId: string, userId: string, ownerId?: string | null): Promise<boolean> {
  if (ownerId && ownerId === userId) return true
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (GLOBAL_STAFF.includes(u?.role || '')) return true
  if (scope === 'voice_room') {
    const r = await prisma.chatUserRole.findUnique({
      where: { roomId_userId: { roomId: scopeId, userId } },
      select: { role: true },
    })
    return (r ? ROLE_HIERARCHY[r.role as keyof typeof ROLE_HIERARCHY] || 0 : 0) >= ROLE_HIERARCHY['op']
  }
  const mod = await prisma.streamModerator.findFirst({ where: { streamId: scopeId, userId }, select: { id: true } })
  return !!mod
}

/**
 * Mesajı sunucuda denetler ve gerekirse eylemi uygular.
 * Hata durumunda (ör. DB) mesaj ENGELLENMEZ (fail-open) ve loglanır.
 */
export async function moderateMessage(params: {
  scope: ModScope
  scopeId: string
  userId: string
  text: string
}): Promise<ModerationResult> {
  const { scope, scopeId, userId, text } = params
  try {
    const cfg = await getGirLiveConfig()
    if (!cfg.enabled) return ALLOWED
    const target = await loadTarget(scope, scopeId)
    if (!target || !target.autoModeration) return ALLOWED

    const entries: BannedWordEntry[] = [
      ...DEFAULT_BANNED_WORDS,
      ...cfg.words,
      ...target.customWords.map((word): BannedWordEntry => ({ word, severity: 'MEDIUM' })),
    ]
    const hit = detectViolation(text, entries, [...cfg.whitelist, ...target.whitelist])
    if (!hit) return ALLOWED

    if (await isExempt(scope, scopeId, userId, target.ownerId)) return ALLOWED

    const prior = await prisma.userModerationAction.count({
      where: { scope, scopeId, userId, createdAt: { gte: new Date(Date.now() - PRIOR_WINDOW_MS) } },
    })
    const { severity, rule } = decideAction(hit.severity, prior, cfg.actions)
    const botId = await getGirLiveBotId()
    const name = await displayName(userId)
    const expiresAt =
      rule.minutes && (rule.action === 'mute' || rule.action === 'ban')
        ? new Date(Date.now() + rule.minutes * 60_000)
        : null

    await applyAction({ scope, scopeId, userId, botId, name, action: rule.action, expiresAt, reason: `GirLive: ${hit.word}` })

    await prisma.userModerationAction.create({
      data: {
        scope,
        scopeId,
        userId,
        severity,
        baseSeverity: hit.severity,
        action: rule.action,
        matchedWord: hit.word,
        messageExcerpt: text.slice(0, 120),
        expiresAt,
      },
    })
    await recordAudit({
      actorId: botId,
      actorRole: 'system',
      action: `girlive_${rule.action}`,
      targetType: scope === 'voice_room' ? 'ChatRoom' : 'VideoStream',
      targetId: scopeId,
      description: `GirLive Bot ${rule.action}: @${name} (${severity})`,
      metadata: { userId, word: hit.word, baseSeverity: hit.severity, prior },
    })

    await postBotMessage(scope, scopeId, botNoticeFor(rule.action, name))

    const verdict = rule.action === 'warn' ? 'warning' : rule.action
    return {
      allowed: false,
      verdict,
      severity,
      word: hit.word,
      message: 'Mesajınız oda kurallarına aykırı olduğu için gönderilmedi.',
    }
  } catch (e) {
    console.error('[GirLive] moderasyon hatası (fail-open):', e)
    return ALLOWED
  }
}

async function applyAction(a: {
  scope: ModScope
  scopeId: string
  userId: string
  botId: string
  name: string
  action: ModAction
  expiresAt: Date | null
  reason: string
}): Promise<void> {
  const { scope, scopeId, userId, botId, action, expiresAt, reason } = a
  if (action === 'warn') return

  if (scope === 'voice_room') {
    if (action === 'mute') {
      await prisma.chatMute.upsert({
        where: { roomId_userId: { roomId: scopeId, userId } },
        update: { mutedBy: botId, reason, expiresAt },
        create: { roomId: scopeId, userId, mutedBy: botId, reason, expiresAt },
      })
      emitChatEvent(scopeId, 'system', {
        event: 'USER_MUTED',
        userId,
        userName: a.name,
        duration: expiresAt ? Math.round((expiresAt.getTime() - Date.now()) / 60_000) : null,
        moderator: BOT_NAME,
      })
      return
    }
    if (action === 'kick') {
      await prisma.chatPresence.deleteMany({ where: { roomId: scopeId, userId } })
      emitChatEvent(scopeId, 'system', { event: 'USER_KICKED', userId, userName: a.name, reason, moderator: BOT_NAME })
      return
    }
    // ban
    await prisma.chatBan.upsert({
      where: { roomId_userId: { roomId: scopeId, userId } },
      update: { bannedBy: botId, reason, expiresAt },
      create: { roomId: scopeId, userId, bannedBy: botId, reason, expiresAt },
    })
    await prisma.chatPresence.deleteMany({ where: { roomId: scopeId, userId } })
    emitChatEvent(scopeId, 'system', { event: 'USER_BANNED', userId, userName: a.name, reason, moderator: BOT_NAME })
    return
  }

  // Canlı yayın: `kick` izleyiciyi yayından ÇIKARIR ama yasaklamaz (yeniden girebilir);
  // `ban` StreamBan yazar. İstemci `viewerKicked` olayını alınca yayından ayrılır.
  if (action === 'kick') {
    await prisma.videoStreamViewer.updateMany({
      where: { streamId: scopeId, viewerId: userId, leftAt: null },
      data: { leftAt: new Date() },
    })
    emitStreamEvent(scopeId, 'viewerKicked', {
      type: 'viewerKicked',
      streamId: scopeId,
      userId,
      reason,
      moderator: BOT_NAME,
    })
    return
  }
  if (action === 'mute') {
    await prisma.streamMutedViewer.upsert({
      where: { streamId_viewerId: { streamId: scopeId, viewerId: userId } },
      update: { mutedBy: botId, reason, expiresAt },
      create: { streamId: scopeId, viewerId: userId, mutedBy: botId, reason, expiresAt },
    })
    return
  }
  await prisma.streamBan.upsert({
    where: { streamId_bannedUserId: { streamId: scopeId, bannedUserId: userId } },
    update: { reason },
    create: { streamId: scopeId, bannedUserId: userId, reason },
  })
}

/** Moderatör paneli: kullanıcı başına son ihlaller ("Uyarılar"). */
export async function listModerationActions(scope: ModScope, scopeId: string, take = 50) {
  const rows = await prisma.userModerationAction.findMany({
    where: { scope, scopeId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(take, 100),
  })
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r: { userId: string }) => r.userId))] as string[] } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byId = new Map(users.map((u: { id: string }) => [u.id, u]))
  return rows.map((r: any) => ({ ...r, user: byId.get(r.userId) ?? { id: r.userId } }))
}

export { DEFAULT_SEVERITY_ACTIONS }
