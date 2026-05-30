import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { fortuneId: string } }) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { fortuneId } = params
    const body = await req.json()
    const { action } = body // 'save', 'unsave', 'pin', 'unpin'

    // Verify ownership
    const fortune = await prisma.fortune.findFirst({
      where: { id: fortuneId, userId: auth.id }
    })

    if (!fortune) {
      return NextResponse.json({ error: 'Fortune not found' }, { status: 404 })
    }

    const updateData: { isSaved?: boolean; isPinned?: boolean; pinnedAt?: Date | null } = {}

    if (action === 'save') {
      updateData.isSaved = true
    } else if (action === 'unsave') {
      updateData.isSaved = false
    } else if (action === 'pin') {
      // Check if user already has 3 pinned fortunes
      const pinnedCount = await prisma.fortune.count({
        where: { userId: auth.id, isPinned: true }
      })

      if (pinnedCount >= 3 && !fortune.isPinned) {
        return NextResponse.json({ error: 'Maximum 3 pinned fortunes allowed' }, { status: 400 })
      }

      updateData.isPinned = true
      updateData.pinnedAt = new Date()
    } else if (action === 'unpin') {
      updateData.isPinned = false
      updateData.pinnedAt = null
    }

    const updated = await prisma.fortune.update({
      where: { id: fortuneId },
      data: updateData
    })

    return NextResponse.json({ success: true, fortune: updated })
  } catch (error) {
    console.error('Fortune update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
