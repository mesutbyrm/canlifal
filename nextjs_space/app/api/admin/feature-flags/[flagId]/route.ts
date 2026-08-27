export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'

const ADMIN_ROLES = ['admin', 'yonetici']

// PATCH /api/admin/feature-flags/[flagId] — bayrak güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await req.json()
  const { enabled, description, platform, percentage, metadata } = body

  const flag = await prisma.featureFlag.update({
    where: { id: params.flagId },
    data: {
      ...(typeof enabled === 'boolean' && { enabled }),
      ...(description !== undefined && { description }),
      ...(platform && { platform }),
      ...(typeof percentage === 'number' && { percentage }),
      ...(metadata !== undefined && { metadata }),
    },
  })

  invalidateCache('config:public')
  return NextResponse.json({ success: true, data: flag })
}

// DELETE /api/admin/feature-flags/[flagId] — bayrak sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  await prisma.featureFlag.delete({ where: { id: params.flagId } })
  invalidateCache('config:public')
  return NextResponse.json({ success: true })
}
