import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { authenticateRequest } from '@/lib/mobile-auth'

// GET messages with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const currentUserId = auth.id
    const otherUserId = params.userId

    // Get other user info
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        messagePrivacy: true
      }
    })

    if (!otherUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Check if they are following each other
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: otherUserId
        }
      }
    })

    const isFollowedBy = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: otherUserId,
          followingId: currentUserId
        }
      }
    })

    // Check message permission
    let canMessage = true
    let requiresRequest = false

    if (otherUser.messagePrivacy === 'nobody') {
      canMessage = false
    } else if (otherUser.messagePrivacy === 'followers') {
      // Only followers can message
      if (!isFollowedBy) {
        // Check if there's an accepted message request
        const acceptedRequest = await prisma.messageRequest.findUnique({
          where: {
            senderId_receiverId: {
              senderId: currentUserId,
              receiverId: otherUserId
            }
          }
        })

        if (!acceptedRequest || acceptedRequest.status !== 'accepted') {
          requiresRequest = true
        }
      }
    }

    // Get messages between the two users
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    // Mark messages as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: { isRead: true }
    })

    return NextResponse.json({
      user: otherUser,
      messages,
      canMessage,
      requiresRequest,
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const currentUserId = auth.id
    const otherUserId = params.userId
    const { content, imageUrl } = await request.json()

    if (!content?.trim() && !imageUrl) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    // Get other user's privacy settings
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { messagePrivacy: true }
    })

    if (!otherUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Check message permission
    if (otherUser.messagePrivacy === 'nobody') {
      return NextResponse.json({ error: 'This user is not accepting messages' }, { status: 403 })
    }

    if (otherUser.messagePrivacy === 'followers') {
      // Check if current user follows the other user (they need to be followed BY the other user)
      const isFollowedBy = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: otherUserId,
            followingId: currentUserId
          }
        }
      })

      if (!isFollowedBy) {
        // Check for accepted message request
        const acceptedRequest = await prisma.messageRequest.findUnique({
          where: {
            senderId_receiverId: {
              senderId: currentUserId,
              receiverId: otherUserId
            }
          }
        })

        if (!acceptedRequest || acceptedRequest.status !== 'accepted') {
          return NextResponse.json({ error: 'Message request required' }, { status: 403 })
        }
      }
    }

    // Create the message
    const message = await prisma.directMessage.create({
      data: {
        senderId: currentUserId,
        receiverId: otherUserId,
        content: content?.trim() || '',
        imageUrl
      }
    })

    // Update or create conversation
    const [minId, maxId] = [currentUserId, otherUserId].sort()
    await prisma.conversation.upsert({
      where: {
        user1Id_user2Id: {
          user1Id: minId,
          user2Id: maxId
        }
      },
      create: {
        user1Id: minId,
        user2Id: maxId,
        lastMessageText: content?.trim()?.slice(0, 100) || '[Image]',
        lastMessageAt: new Date()
      },
      update: {
        lastMessageText: content?.trim()?.slice(0, 100) || '[Image]',
        lastMessageAt: new Date()
      }
    })

    // Create notification + push (with mobile navigation data)
    const messagePreview = (content?.trim() || '[Görsel]').slice(0, 120)
    createNotificationWithPush({
      userId: otherUserId,
      type: 'message',
      message: 'size bir mesaj gönderdi',
      fromUserId: currentUserId,
      fromUserName: auth.name || 'Birisi',
      data: JSON.stringify({ senderId: currentUserId }),
      targetPath: `/chat/${otherUserId}`,
      targetId: otherUserId,
      urgent: true,
    }).catch((err: any) => console.error('Message notification error:', err))

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
