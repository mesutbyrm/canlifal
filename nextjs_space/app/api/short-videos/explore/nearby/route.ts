export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo } from '@/lib/short-videos'

const EARTH_RADIUS_KM = 6371

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * GET /api/short-videos/explore/nearby
 * Auth: opsiyonel
 * Query: ?lat=&lng=&radiusKm=&location=&limit=
 *
 * Konum bilgisi olan kısa videoları döndürür.
 * - lat & lng verilirse yarıçap içindekiler mesafeye göre sıralanır.
 * - Yalnız location verilirse ad eşleşmesi yapılır.
 * - Hiçbiri verilmezse konumu olan en yeni videolar döner.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 40)
    const location = (searchParams.get('location') || '').trim()
    const latRaw = parseFloat(searchParams.get('lat') || '')
    const lngRaw = parseFloat(searchParams.get('lng') || '')
    const hasCoords = Number.isFinite(latRaw) && Number.isFinite(lngRaw)
    const radiusKm = Math.min(
      Math.max(parseFloat(searchParams.get('radiusKm') || '50') || 50, 1),
      2000
    )

    const authUser = await authenticateRequest(req).catch(() => null)

    const where: any = { visibility: 'everyone' }
    if (hasCoords) {
      // Kaba bounding box — ardından tam mesafe hesabı yapılır.
      const latDelta = radiusKm / 111
      const cosLat = Math.max(0.01, Math.cos((latRaw * Math.PI) / 180))
      const lngDelta = radiusKm / (111 * cosLat)
      where.locationLat = { gte: latRaw - latDelta, lte: latRaw + latDelta }
      where.locationLng = { gte: lngRaw - lngDelta, lte: lngRaw + lngDelta }
    } else if (location) {
      where.locationName = { contains: location, mode: 'insensitive' }
    } else {
      where.locationName = { not: null }
    }

    const videos = await prisma.shortVideo.findMany({
      where,
      take: hasCoords ? Math.min(limit * 4, 120) : limit,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
        music: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
        ...(authUser
          ? {
              likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    let items = videos.map((v: any) => {
      const distanceKm =
        hasCoords && v.locationLat != null && v.locationLng != null
          ? haversineKm(latRaw, lngRaw, v.locationLat, v.locationLng)
          : null
      return {
        ...mapVideo(v, authUser?.id),
        locationName: v.locationName ?? null,
        locationLat: v.locationLat ?? null,
        locationLng: v.locationLng ?? null,
        distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
      }
    })

    if (hasCoords) {
      items = items
        .filter((v: any) => v.distanceKm != null && v.distanceKm <= radiusKm)
        .sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
        .slice(0, limit)
    }

    return NextResponse.json({
      success: true,
      data: {
        videos: items,
        items,
        center: hasCoords ? { lat: latRaw, lng: lngRaw, radiusKm } : null,
        location: location || null,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] explore/nearby error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yakınlardaki videolar alınamadı' } },
      { status: 500 }
    )
  }
}
