// PostgreSQL database connection with connection pooling
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Create Prisma client with strict connection pool limits
const createPrismaClient = () => {
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Remove any existing connection parameters and add our strict ones
  const cleanUrl = baseUrl.split('?')[0]
  const pooledUrl = `${cleanUrl}?connection_limit=2&pool_timeout=5&connect_timeout=5&statement_timeout=5000`
  
  return new PrismaClient({
    datasources: {
      db: {
        url: pooledUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Use global variable to ensure single instance across hot reloads and serverless functions
const isNewClient = !global.__prisma
export const prisma = global.__prisma ?? createPrismaClient()

// Prisma middleware: auto-send OneSignal push when a notification is created
// Only register once (not on hot reloads)
if (isNewClient) {
prisma.$use(async (params: any, next: any) => {
  const result = await next(params)
  
  // Only trigger on notification create
  if (params.model === 'Notification' && params.action === 'create' && result) {
    try {
      const { sendOneSignalPush, getNotificationTitle, getNotificationUrl } = await import('@/lib/onesignal')
      
      const userId = result.userId
      const type = result.type || ''
      const title = result.title || getNotificationTitle(type)
      const fromUserName = result.fromUserName || ''
      const message = fromUserName ? `${fromUserName} ${result.message}` : result.message
      
      let parsedData: Record<string, any> = {}
      if (result.data) {
        try { parsedData = JSON.parse(result.data) } catch (e) {}
      }
      if (result.postId) parsedData.postId = result.postId
      
      const url = getNotificationUrl(type, parsedData)
      
      // Fire and forget - don't block the DB response
      sendOneSignalPush({ userId, title, message, url, data: parsedData })
        .catch(err => console.error('OneSignal push (middleware) failed:', err))
    } catch (err) {
      // Silently ignore - push is best-effort
      console.error('OneSignal middleware error:', err)
    }
  }
  
  return result
})
} // end if (isNewClient)

// Always cache globally - critical for serverless/edge environments
global.__prisma = prisma

export default prisma
