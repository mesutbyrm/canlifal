import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { NextResponse } from 'next/server'
import { getEffectivePermissions, PERMISSION_GROUPS, PERMISSIONS } from '@/lib/permissions'
import { apiSuccess, apiInternalError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/admin-capabilities
 * Oturumdaki kullanıcının efektif yetki listesi. Yalnız UI görünürlüğü içindir;
 * her uç nokta kendi yetki kontrolünü ayrıca yapar (§46).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const user = (auth as any).user
    const { isSuper, permissions } = await getEffectivePermissions(user.role, user.id)
    return apiSuccess({
      role: user.role,
      is_super_admin: isSuper,
      permissions,
      groups: PERMISSION_GROUPS,
      catalog: PERMISSIONS,
    })
  } catch (e: any) {
    console.error('[admin-capabilities] error:', e)
    return apiInternalError(e?.message || 'Yetkiler alınamadı')
  }
}
