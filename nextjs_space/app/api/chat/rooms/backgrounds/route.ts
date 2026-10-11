import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/rooms/backgrounds
 *
 * Tüm aktif sohbet odalarının arka plan görsellerini döndürür.
 * Flutter ve web tarafında oda arka planlarını önceden yüklemek için kullanılır.
 */
export async function GET() {
  try {
    const backgrounds = await getCached('chat:room-backgrounds', 120, async () => {
      const rooms = await prisma.chatRoom.findMany({
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameTr: true,
          backgroundImage: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      return rooms.map((room) => ({
        roomId: room.id,
        slug: room.slug,
        name: room.nameTr || room.nameEn || '',
        backgroundImage: room.backgroundImage || null,
      }))
    })

    return NextResponse.json({
      success: true,
      backgrounds,
    })
  } catch (error) {
    console.error('[backgrounds] Error:', error)
    return NextResponse.json(
      { error: 'Arka plan görselleri alınamadı' },
      { status: 500 }
    )
  }
}
