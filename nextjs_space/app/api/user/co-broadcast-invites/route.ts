import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Get pending co-broadcast invitations for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find invitations where user is invited
    const invitations = await prisma.streamCoBroadcaster.findMany({
      where: {
        userId: session.user.id,
        status: 'invited'
      },
      orderBy: { invitedAt: 'desc' }
    })

    // Get stream info for each invitation
    const streamIds = invitations.map((inv: any) => inv.streamId)
    const streams = await prisma.videoStream.findMany({
      where: { 
        id: { in: streamIds },
        status: 'live'
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Map invitations with stream data
    const activeInvitations = invitations
      .map((inv: any) => {
        const stream = streams.find((s: any) => s.id === inv.streamId)
        if (!stream) return null
        return {
          id: inv.id,
          streamId: inv.streamId,
          status: inv.status,
          invitedAt: inv.invitedAt,
          broadcaster: {
            id: stream.user.id,
            name: stream.user.name,
            image: stream.user.image
          },
          streamTitle: stream.title,
          streamCategory: stream.category
        }
      })
      .filter(Boolean)

    return NextResponse.json(activeInvitations)
  } catch (error) {
    console.error('Error fetching co-broadcast invites:', error)
    return NextResponse.json([], { status: 500 })
  }
}
