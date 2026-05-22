import prisma from '@/lib/db'
import { sendPushToUser, sendPushToMultipleUsers, getNotificationTitle } from '@/lib/onesignal'

interface NotifyParams {
  userId: string
  type: string
  message: string
  title?: string
  postId?: string
  fromUserId?: string
  fromUserName?: string
  data?: string // JSON string
  // Mobile push fields
  targetPath?: string
  targetId?: string
  urgent?: boolean
}

/**
 * Create a DB notification AND send a OneSignal push notification.
 * Push is fire-and-forget: errors logged but never block the response.
 */
export async function createNotificationWithPush(params: NotifyParams) {
  try {
    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        title: params.title,
        postId: params.postId,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
        data: params.data,
      }
    })

    // 2. Send OneSignal push (fire and forget)
    const pushTitle = params.title || getNotificationTitle(params.type)
    const pushBody = params.fromUserName
      ? `${params.fromUserName} ${params.message}`
      : params.message

    sendPushToUser(params.userId, {
      title: pushTitle,
      body: pushBody.slice(0, 200),
      type: params.type,
      targetPath: params.targetPath || '',
      targetId: params.targetId || '',
      urgent: params.urgent || false,
    }).catch(err => console.error('OneSignal push failed (non-blocking):', err))

    return notification
  } catch (error) {
    console.error('createNotificationWithPush error:', error)
    throw error
  }
}

/**
 * Create DB notifications for multiple users AND send a batch push.
 * Push is fire-and-forget.
 */
export async function createBulkNotificationsWithPush(params: {
  userIds: string[]
  type: string
  title: string
  message: string
  data?: string
  fromUserId?: string
  fromUserName?: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
}) {
  if (params.userIds.length === 0) return

  try {
    // 1. Create DB notifications in bulk
    await prisma.notification.createMany({
      data: params.userIds.map(uid => ({
        userId: uid,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
      })),
    })

    // 2. Send batch push (fire and forget)
    sendPushToMultipleUsers(params.userIds, {
      title: params.title,
      body: params.message.slice(0, 200),
      type: params.type,
      targetPath: params.targetPath || '',
      targetId: params.targetId || '',
      urgent: params.urgent || false,
    }).catch(err => console.error('OneSignal bulk push failed (non-blocking):', err))
  } catch (error) {
    console.error('createBulkNotificationsWithPush error:', error)
  }
}
