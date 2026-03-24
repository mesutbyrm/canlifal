import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// DELETE old chat messages (older than 24 hours)
// Can be called by a scheduled task/cron job
export async function DELETE(req: NextRequest) {
  try {
    // Verify internal/cron authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const result = await prisma.chatMessage.deleteMany({
      where: {
        createdAt: {
          lt: twentyFourHoursAgo
        }
      }
    })

    console.log(`[Chat Cleanup] Deleted ${result.count} messages older than 24 hours`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      olderThan: twentyFourHoursAgo.toISOString()
    })
  } catch (error) {
    console.error('Chat cleanup error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// Also support GET for easier cron integration
export async function GET(req: NextRequest) {
  return DELETE(req)
}
