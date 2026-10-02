export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireFullAdmin } from '@/lib/rbac'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getGirLiveConfig, saveGirLiveConfig } from '@/lib/girlive-bot'
import { DEFAULT_BANNED_WORDS, DEFAULT_SEVERITY_ACTIONS } from '@/lib/girlive-moderation-core'
import { recordAudit } from '@/lib/audit-log'

/**
 * GET /api/admin/girlive-bot — GirLive Bot yapılandırması (kurallar, hoş geldin
 * metni, ciddiyet→eylem eşlemesi, eklenen kelimeler, güvenli kelimeler).
 * PUT — kısmi güncelleme. Yalnızca tam yöneticiler (admin/yonetici).
 */
export async function GET(req: NextRequest) {
  const denied = await requireFullAdmin(req)
  if (denied) return denied
  const config = await getGirLiveConfig()
  return NextResponse.json({
    success: true,
    data: {
      config,
      defaults: { actions: DEFAULT_SEVERITY_ACTIONS, wordCount: DEFAULT_BANNED_WORDS.length },
    },
  })
}

export async function PUT(req: NextRequest) {
  const denied = await requireFullAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const patch: Parameters<typeof saveGirLiveConfig>[0] = {}
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
    if (typeof body.welcomeText === 'string') patch.welcomeText = body.welcomeText
    if (typeof body.rulesText === 'string') patch.rulesText = body.rulesText
    if (body.actions && typeof body.actions === 'object') patch.actions = body.actions
    if (Array.isArray(body.words)) patch.words = body.words
    if (Array.isArray(body.whitelist)) patch.whitelist = body.whitelist
    const config = await saveGirLiveConfig(patch)
    const actor = await authenticateRequest(req)
    if (actor) {
      await recordAudit({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'girlive_config_update',
        targetType: 'SiteSetting',
        description: 'GirLive Bot ayarları güncellendi',
        metadata: { keys: Object.keys(patch) },
      })
    }
    return NextResponse.json({ success: true, data: { config } })
  } catch (e) {
    console.error('girlive-bot config error:', e)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Ayarlar kaydedilemedi' } },
      { status: 500 }
    )
  }
}
