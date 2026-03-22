import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/onesignal-admin'

export const dynamic = 'force-dynamic'

// Internal endpoint for morning dream reminder push notification
export async function POST(req: NextRequest) {
  try {
    // Simple auth via header
    const authHeader = req.headers.get('x-cron-secret')
    if (authHeader !== process.env.CRON_SECRET && authHeader !== 'dream-reminder-cron') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = [
      { title: '🌙 Günaydın! Rüyanı Hatırla', message: 'Dün gece ne rüya gördün? Günlüğüne kaydet, unutma!' },
      { title: '✨ Rüya Günlüğü Zamanı', message: 'Sabahın ilk ışığında rüyalarını yaz. Detaylar silinmeden kaydet!' },
      { title: '💭 Rüyanı Yazdın mı?', message: 'Rüyaların en taze haliyle kaydedilmeli. Hemen günlüğüne yaz!' },
      { title: '🌟 Bugunkü Rüya Mesajın', message: 'Rüyaların bilinçaltının anahtarıdır. Bugün ne gördüğünü paylaş!' },
      { title: '🔮 Rüya Takvimin Seni Bekliyor', message: 'Günlük rüya kaydını tutarak rüya dünyanı keşfet!' },
    ]

    const randomMsg = messages[Math.floor(Math.random() * messages.length)]
    const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'

    const result = await sendNotification({
      title: randomMsg.title,
      message: randomMsg.message,
      url: `${baseUrl}/ruya-takvimi`,
      targetType: 'all',
    })

    return NextResponse.json({
      success: result.success,
      message: randomMsg.title,
      recipientCount: result.recipientCount,
      error: result.error,
    })
  } catch (error) {
    console.error('Morning reminder error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
