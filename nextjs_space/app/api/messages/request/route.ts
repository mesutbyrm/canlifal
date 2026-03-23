import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// POST create a message request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const { receiverId, message } = await request.json()
    const senderId = session.user.id

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }

    // Check if request already exists
    const existingRequest = await prisma.messageRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId
        }
      }
    })

    if (existingRequest) {
      return NextResponse.json({ 
        error: existingRequest.status === 'pending' ? 'Request already pending' : 'Request already processed',
        status: existingRequest.status 
      }, { status: 400 })
    }

    // Create the request
    const messageRequest = await prisma.messageRequest.create({
      data: {
        senderId,
        receiverId,
        message: message?.slice(0, 200)
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'message_request',
        message: `${session.user.name} size mesaj göndermek istiyor`,
        data: JSON.stringify({ senderId })
      }
    })

    return NextResponse.json({ request: messageRequest })
  } catch (error) {
    console.error('Error creating message request:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PATCH accept/reject a message request
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const { requestId, action } = await request.json()
    const userId = session.user.id

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    // Find the request
    const messageRequest = await prisma.messageRequest.findFirst({
      where: {
        id: requestId,
        receiverId: userId,
        status: 'pending'
      },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      }
    })

    if (!messageRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Update the request status
    const updatedRequest = await prisma.messageRequest.update({
      where: { id: requestId },
      data: { status: action === 'accept' ? 'accepted' : 'rejected' }
    })

    // Notify the sender
    await prisma.notification.create({
      data: {
        userId: messageRequest.senderId,
        type: 'message_request_response',
        message: action === 'accept'
          ? `${session.user.name} mesaj isteğinizi kabul etti`
          : `${session.user.name} mesaj isteğinizi reddetti`,
        data: JSON.stringify({ action, receiverId: userId })
      }
    })

    return NextResponse.json({ request: updatedRequest })
  } catch (error) {
    console.error('Error processing message request:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
