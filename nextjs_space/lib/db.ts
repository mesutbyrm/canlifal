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
export const prisma = global.__prisma ?? createPrismaClient()

// Always cache globally - critical for serverless/edge environments
global.__prisma = prisma

export default prisma
