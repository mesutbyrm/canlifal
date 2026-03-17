import prisma from '@/lib/db'
import { sendOneSignalPush, getNotificationTitle, getNotificationUrl } from '@/lib/onesignal'

interface NotifyParams {
  userId: string
  type: string
  message: string
  title?: string
  postId?: string
  fromUserId?: string
  fromUserName?: string
  data?: string // JSON string
}

/**
 * Create a DB notification AND send a OneSignal push notification.
 * This should be used instead of direct prisma.notification.create calls
 * when you also want a push notification.
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

    // 2. Send OneSignal push (fire and forget - don't block the response)
    const pushTitle = params.title || getNotificationTitle(params.type)
    const pushMessage = params.fromUserName 
      ? `${params.fromUserName} ${params.message}`
      : params.message
    
    let parsedData: Record<string, any> = {}
    if (params.data) {
      try { parsedData = JSON.parse(params.data) } catch (e) {}
    }
    if (params.postId) parsedData.postId = params.postId
    
    const pushUrl = getNotificationUrl(params.type, parsedData)

    sendOneSignalPush({
      userId: params.userId,
      title: pushTitle,
      message: pushMessage,
      url: pushUrl,
      data: parsedData,
    }).catch(err => console.error('OneSignal push failed (non-blocking):', err))

    return notification
  } catch (error) {
    console.error('createNotificationWithPush error:', error)
    throw error
  }
}
