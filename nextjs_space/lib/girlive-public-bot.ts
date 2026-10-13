/**
 * GirLive Herkese Açık Bot — Jeton tanıtımı, PK mesajları, karşılama/uğurlama.
 * Admin ayarları SiteSetting `girlive.public.*` anahtarlarında tutulur.
 * postBotMessage ile normal sohbete yazılır.
 */
import prisma from '@/lib/db'
import { getCached, invalidateCache } from '@/lib/cache'
import { postBotMessage, getGirLiveBotId, type ModScope } from '@/lib/girlive-bot'
import { resolveGreetingName } from '@/lib/girlive-publisher'
import { emitChatEvent } from '@/lib/chat-events'

// ── Ayar yapısı ─────────────────────────────────────────────
export interface PublicBotConfig {
  jetonPromoEnabled: boolean
  pkStartEnabled: boolean
  pkMidReminderEnabled: boolean
  pkEndEnabled: boolean
  pastPkMotivationEnabled: boolean
  welcomeLeaveEnabled: boolean
  minMessageIntervalSec: number
  templates: Record<string, string>
}

const PUBLIC_CONFIG_KEY = 'girlive.public_config'

const DEFAULT_CONFIG: PublicBotConfig = {
  jetonPromoEnabled: true,
  pkStartEnabled: true,
  pkMidReminderEnabled: false,
  pkEndEnabled: true,
  pastPkMotivationEnabled: false,
  welcomeLeaveEnabled: true,
  minMessageIntervalSec: 30,
  templates: {
    pk_start: '⚔️ PK başladı! {hostName} vs {guestName} — hediye göndererek destekleyin!',
    pk_end: '🏆 PK bitti! Kazanan: {winnerName} ({winnerScore} - {loserScore} jeton)',
    pk_draw: '🤝 PK berabere! Her iki tarafı da tebrik edelim!',
    jeton_promo: '💎 Jeton almak için profil → Jeton bölümüne göz atın!',
    welcome: '👋 Hoş geldin {name}!',
    leave: '👋 Görüşmek üzere {name}!',
  },
}

export async function getPublicBotConfig(): Promise<PublicBotConfig> {
  return getCached('girlive:public_config', 60, async () => {
    const row = await prisma.siteSetting.findUnique({ where: { key: PUBLIC_CONFIG_KEY } })
    if (!row) return DEFAULT_CONFIG
    try {
      const parsed = JSON.parse(row.value)
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      return DEFAULT_CONFIG
    }
  })
}

export async function savePublicBotConfig(patch: Partial<PublicBotConfig>): Promise<PublicBotConfig> {
  const current = await getPublicBotConfig()
  const merged = { ...current, ...patch }
  if (patch.templates) merged.templates = { ...current.templates, ...patch.templates }
  await prisma.siteSetting.upsert({
    where: { key: PUBLIC_CONFIG_KEY },
    update: { value: JSON.stringify(merged) },
    create: { key: PUBLIC_CONFIG_KEY, value: JSON.stringify(merged) },
  })
  invalidateCache('girlive:public_config')
  return merged
}

// ── Spam koruması ─────────────────────────────────────────────
const lastSent = new Map<string, number>()

function canSend(scope: ModScope, scopeId: string, kind: string, intervalSec: number): boolean {
  const key = `${scope}:${scopeId}:${kind}`
  const now = Date.now()
  const last = lastSent.get(key)
  if (last && now - last < intervalSec * 1000) return false
  lastSent.set(key, now)
  // Bellek temizliği
  if (lastSent.size > 2000) {
    for (const [k, t] of lastSent) if (now - t > 300_000) lastSent.delete(k)
  }
  return true
}

// ── PK mesajları ──────────────────────────────────────────────
export async function onPkStart(
  scope: ModScope,
  scopeId: string,
  hostName: string,
  guestName: string,
): Promise<void> {
  const cfg = await getPublicBotConfig()
  if (!cfg.pkStartEnabled) return
  if (!canSend(scope, scopeId, 'pk_start', cfg.minMessageIntervalSec)) return
  const text = (cfg.templates.pk_start || DEFAULT_CONFIG.templates.pk_start)
    .replace('{hostName}', hostName)
    .replace('{guestName}', guestName)
  await postBotMessage(scope, scopeId, text)
}

export async function onPkEnd(
  scope: ModScope,
  scopeId: string,
  winnerName: string | null,
  winnerScore: number,
  loserScore: number,
  isDraw: boolean,
): Promise<void> {
  const cfg = await getPublicBotConfig()
  if (!cfg.pkEndEnabled) return
  if (!canSend(scope, scopeId, 'pk_end', cfg.minMessageIntervalSec)) return
  const template = isDraw
    ? (cfg.templates.pk_draw || DEFAULT_CONFIG.templates.pk_draw)
    : (cfg.templates.pk_end || DEFAULT_CONFIG.templates.pk_end)
  const text = template
    .replace('{winnerName}', winnerName || '?')
    .replace('{winnerScore}', String(winnerScore))
    .replace('{loserScore}', String(loserScore))
  await postBotMessage(scope, scopeId, text)
}

// ── Selam / Çıkış (Patron kuralı) ────────────────────────────
export async function onUserJoin(
  scope: ModScope,
  scopeId: string,
  userId: string,
): Promise<void> {
  const cfg = await getPublicBotConfig()
  if (!cfg.welcomeLeaveEnabled) return
  if (!canSend(scope, scopeId, `welcome:${userId}`, 300)) return // 5 dk dedupe
  const { displayName } = await resolveGreetingName(userId)
  const text = (cfg.templates.welcome || DEFAULT_CONFIG.templates.welcome)
    .replace('{name}', displayName)
  await postBotMessage(scope, scopeId, text)
}

export async function onUserLeave(
  scope: ModScope,
  scopeId: string,
  userId: string,
): Promise<void> {
  const cfg = await getPublicBotConfig()
  if (!cfg.welcomeLeaveEnabled) return
  if (!canSend(scope, scopeId, `leave:${userId}`, 300)) return
  const { displayName } = await resolveGreetingName(userId)
  const text = (cfg.templates.leave || DEFAULT_CONFIG.templates.leave)
    .replace('{name}', displayName)
  await postBotMessage(scope, scopeId, text)
}

// ── Yayıncıya SSE bildirimi (özel, sohbete yazmaz) ───────────
export async function emitPublisherNotice(
  scope: ModScope,
  scopeId: string,
  targetUserId: string,
  kind: 'live_status' | 'tip' | 'end_report',
  text: string,
  sessionId?: string,
): Promise<void> {
  try {
    if (scope === 'voice_room') {
      emitChatEvent(scopeId, 'room', {
        event: 'girlive_publisher',
        roomId: scopeId,
        targetUserId,
        kind,
        text,
        sessionId: sessionId || null,
      })
    }
    // Canlı yayın SSE ayrıca eklenebilir
  } catch (e) {
    console.error('[GirLive] publisher SSE hatası:', e)
  }
}
