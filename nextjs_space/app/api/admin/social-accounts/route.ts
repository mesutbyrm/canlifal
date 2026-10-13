import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import {
  SOCIAL_PLATFORMS,
  readSocialAccounts,
  writeSocialAccounts,
} from '@/lib/site-social-accounts'

export const dynamic = 'force-dynamic'

// Site sosyal hesaplarını yönetme yetkisi: system.config.manage (yedek roller: admin, yonetici).
async function requireConfigManager(req: NextRequest): Promise<{ id: string; role: string | null } | NextResponse> {
  const mobileUser = await authenticateRequest(req)
  const webSession = !mobileUser ? await getServerSession(authOptions) : null
  const userId: string | undefined = mobileUser?.id || (webSession?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const allowed = await staffCan(me?.role, userId, 'system.config.manage', ['admin', 'yonetici'])
  if (!allowed) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  return { id: userId, role: me?.role ?? null }
}

// GET /api/admin/social-accounts — tüm platformlar (kapalılar ve boşlar dahil).
export async function GET(req: NextRequest) {
  try {
    const guard = await requireConfigManager(req)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json({ accounts: await readSocialAccounts() })
  } catch (error: any) {
    console.error('[Admin Social Accounts GET] Error:', error)
    return NextResponse.json({ error: 'Sosyal hesaplar alınamadı' }, { status: 500 })
  }
}

// PUT /api/admin/social-accounts — { accounts: [{ platform, value, enabled }] }
// Boş değer o hesabı kaldırır. Bilinmeyen platformlar reddedilir. Her değişiklik audit log'a yazılır.
export async function PUT(req: NextRequest) {
  try {
    const guard = await requireConfigManager(req)
    if (guard instanceof NextResponse) return guard

    const body = await req.json().catch(() => ({}))
    const rows = Array.isArray(body?.accounts) ? body.accounts : null
    if (!rows) {
      return NextResponse.json({ error: 'accounts dizisi gerekli' }, { status: 400 })
    }

    const unknown = rows
      .map((r: any) => String(r?.platform ?? ''))
      .filter((p: string) => !SOCIAL_PLATFORMS[p])
    if (unknown.length > 0) {
      return NextResponse.json({ error: `Bilinmeyen platform: ${unknown.join(', ')}` }, { status: 400 })
    }

    const before = await readSocialAccounts()
    const after = await writeSocialAccounts(
      rows.map((r: any) => ({
        platform: String(r.platform),
        value: String(r.value ?? ''),
        enabled: r.enabled !== false,
      }))
    )

    recordAudit({
      actorId: guard.id,
      actorRole: guard.role ?? undefined,
      ip: getAuditIp(req),
      action: 'social_accounts_update',
      targetType: 'SiteSetting',
      targetId: 'social_accounts',
      before: before.map(({ platform, value, enabled }) => ({ platform, value, enabled })) as any,
      after: after.map(({ platform, value, enabled }) => ({ platform, value, enabled })) as any,
      description: 'Site sosyal hesapları güncellendi',
    }).catch((e) => console.error('[Audit][social_accounts_update]', e))

    return NextResponse.json({ accounts: after })
  } catch (error: any) {
    console.error('[Admin Social Accounts PUT] Error:', error)
    return NextResponse.json({ error: 'Sosyal hesaplar kaydedilemedi' }, { status: 500 })
  }
}
