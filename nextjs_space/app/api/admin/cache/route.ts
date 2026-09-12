import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getCacheStats, invalidateCache, invalidateCachePrefix } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET: view cache stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    return NextResponse.json(getCacheStats())
  } catch (error) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 })
  }
}

// DELETE: flush all or specific cache
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const prefix = searchParams.get('prefix')

    if (key) {
      invalidateCache(key)
      return NextResponse.json({ cleared: key })
    } else if (prefix) {
      invalidateCachePrefix(prefix)
      return NextResponse.json({ clearedPrefix: prefix })
    } else {
      // Flush all
      invalidateCachePrefix('')
      return NextResponse.json({ cleared: 'all' })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 })
  }
}
