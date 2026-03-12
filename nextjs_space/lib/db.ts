// PostgreSQL database connection with connection pooling
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with connection pool limits
const createPrismaClient = () => {
  // Add connection pool parameters to the DATABASE_URL
  const baseUrl = process.env.DATABASE_URL || ''
  const pooledUrl = baseUrl.includes('?') 
    ? `${baseUrl}&connection_limit=5&pool_timeout=10`
    : `${baseUrl}?connection_limit=5&pool_timeout=10`
  
  return new PrismaClient({
    datasources: {
      db: {
        url: pooledUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Always cache in globalThis to prevent creating new clients per request
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  globalForPrisma.prisma = prisma
}

export default prisma
