import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { PERMISSIONS, getEffectivePermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/me/permissions — oturumdaki kullanıcının gerçek yetki listesi.
// Yalnızca UI görünürlüğü içindir; her admin ucu yetkiyi ayrıca denetler.
// Yanıt: { role, isSuper, permissions: string[], groups: { [group]: string[] } }
export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId: string | undefined = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const role = me?.role || 'user'

    const effective = await getEffectivePermissions(role, userId)
    const granted = new Set(effective.permissions)

    const groups: Record<string, string[]> = {}
    for (const def of PERMISSIONS) {
      if (!granted.has(def.key)) continue
      ;(groups[def.group] ||= []).push(def.key)
    }

    return NextResponse.json({
      role,
      isSuper: effective.isSuper,
      permissions: effective.permissions,
      groups,
    })
  } catch (error: any) {
    console.error('[Me Permissions GET] Error:', error)
    return NextResponse.json({ error: 'Yetkiler alınamadı' }, { status: 500 })
  }
}
