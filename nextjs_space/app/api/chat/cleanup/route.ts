import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// DELETE all chat messages at midnight Turkey time (00:00 UTC+3)
// Called by scheduled task daily or can be triggered manually
export async function DELETE(req: NextRequest) {
  try {
    // Verify internal/cron authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Delete ALL chat messages (midnight cleanup - fresh start each day)
    const result = await prisma.chatMessage.deleteMany({})

    console.log(`[Chat Cleanup] Midnight Turkey time cleanup - Deleted ${result.count} messages`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      cleanupTime: new Date().toISOString(),
      reason: 'Gece yarısı temizliği (Türkiye saati 00:00)'
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

// POST - Also support POST for scheduled task webhook
export async function POST(req: NextRequest) {
  return DELETE(req)
}
