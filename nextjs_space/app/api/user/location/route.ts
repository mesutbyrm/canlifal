import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/** Kullanıcı konumunu güncelle / konum paylaşımını aç/kapat */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const body = await req.json()
  const { latitude, longitude, locationEnabled, showDistance } = body

  const data: any = {}
  if (typeof locationEnabled === 'boolean') data.locationEnabled = locationEnabled
  if (typeof showDistance === 'boolean') data.showDistance = showDistance
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    data.latitude = latitude
    data.longitude = longitude
    data.locationEnabled = true
  }
  if (locationEnabled === false) {
    data.latitude = null
    data.longitude = null
  }

  await prisma.user.update({ where: { id: user.id }, data })
  return NextResponse.json({ success: true, message: 'Konum ayarları güncellendi' })
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { locationEnabled: true, showDistance: true, latitude: true, longitude: true },
  })
  return NextResponse.json({
    success: true,
    data: {
      locationEnabled: u?.locationEnabled || false,
      showDistance: u?.showDistance !== false,
      hasLocation: u?.latitude != null && u?.longitude != null,
    },
  })
}
