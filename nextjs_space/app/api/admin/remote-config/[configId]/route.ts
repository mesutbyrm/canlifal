export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'

const ADMIN_ROLES = ['admin', 'yonetici']

// PATCH /api/admin/remote-config/[configId] — config güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: { configId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await req.json()
  const { value, valueType, group, description, platform } = body

  const config = await prisma.remoteConfig.update({
    where: { id: params.configId },
    data: {
      ...(value !== undefined && { value }),
      ...(valueType && { valueType }),
      ...(group && { group }),
      ...(description !== undefined && { description }),
      ...(platform && { platform }),
    },
  })

  invalidateCache('config:public')
  return NextResponse.json({ success: true, data: config })
}

// DELETE /api/admin/remote-config/[configId] — config sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { configId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  await prisma.remoteConfig.delete({ where: { id: params.configId } })
  invalidateCache('config:public')
  return NextResponse.json({ success: true })
}
