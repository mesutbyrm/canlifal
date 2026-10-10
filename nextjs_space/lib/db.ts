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
  const pooledUrl = `${cleanUrl}?connection_limit=5&pool_timeout=10&connect_timeout=5&statement_timeout=5000`
  
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
export const prisma = global.__prisma ?? createPrismaClient()

// NOT: Eskiden burada her `notification.create` için OneSignal push atan bir
// Prisma middleware vardı. Tek `notification.create` çağıranı `lib/notify.ts`
// olduğu ve o da push gönderdiği için her bildirim İKİ KEZ push'lanıyordu.
// Push artık yalnız `lib/push.ts` üzerinden (FCM) gönderilir.

// Always cache globally - critical for serverless/edge environments
global.__prisma = prisma

export default prisma
