import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

// Check if the recipient has already gifted the sender today
// If so, block the reciprocal gift
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ blocked: false })
    }

    const { recipientId } = await req.json()
    if (!recipientId) {
      return NextResponse.json({ blocked: false })
    }

    // Get start of today (UTC)
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    // Check if the recipient (the person we want to gift) has already gifted US today
    // Look in notifications: recipient gifted us = notification to us from recipient
    const reciprocalGift = await prisma.notification.findFirst({
      where: {
        userId: authUser.id, // notification sent TO current user
        type: 'gift_received',
        fromUserId: recipientId, // FROM the person we want to gift
        createdAt: { gte: todayStart }
      }
    })

    if (reciprocalGift) {
      return NextResponse.json({ blocked: true })
    }

    return NextResponse.json({ blocked: false })
  } catch (error) {
    console.error('Check reciprocal error:', error)
    return NextResponse.json({ blocked: false })
  }
}
