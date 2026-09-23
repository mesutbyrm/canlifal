import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

// GET - Check user's fortune request status for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const fortuneRequest = await prisma.streamFortuneRequest.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: authUser.id
        }
      },
      include: {
        type: { select: { name: true, nameEn: true, icon: true } }
      }
    })
    
    if (!fortuneRequest) {
      return NextResponse.json({ hasPendingRequest: false })
    }
    
    return NextResponse.json({
      hasPendingRequest: fortuneRequest.status === 'pending',
      status: fortuneRequest.status,
      jetonAmount: fortuneRequest.jetonAmount,
      typeName: fortuneRequest.type?.name || 'Genel Soru',
      typeNameEn: fortuneRequest.type?.nameEn || 'General Question',
      typeIcon: fortuneRequest.type?.icon || '☕',
      refundedAt: fortuneRequest.refundedAt,
      completedAt: fortuneRequest.completedAt
    })
  } catch (error) {
    console.error('Error checking fortune request status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
