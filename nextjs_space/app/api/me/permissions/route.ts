/**
 * GET /api/me/permissions
 * Oturum sahibinin efektif yetki listesini döner.
 * Frontend bu listeyle buton/menü gizleme yapar; yetki kontrolü her uçta ayrıca yapılır.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getEffectivePermissions, PERMISSIONS, PERMISSION_GROUPS, SYSTEM_ROLES } from '@/lib/permissions'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Dual auth: mobile JWT or web session
    let userId: string | undefined
    let role: string | undefined

    const mobileUser = await authenticateRequest(request)
    if (mobileUser) {
      userId = mobileUser.id
      role = mobileUser.role ?? 'user'
    } else {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        userId = session.user.id
        role = (session.user as any).role ?? 'user'
      }
    }

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const { isSuper, permissions } = await getEffectivePermissions(role, userId)

    return NextResponse.json({
      success: true,
      data: {
        role,
        isSuper,
        permissions,
        groups: PERMISSION_GROUPS,
      },
    })
  } catch (error) {
    console.error('[/api/me/permissions] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Yetki bilgileri alınamadı' },
      { status: 500 }
    )
  }
}
