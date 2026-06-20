import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ÖNCEKİ HATA: sadece getServerSession (web) kontrol ediliyordu,
    // mobil Bearer JWT hiç tanınmıyordu — Flutter her zaman 401 alıyordu.
    // authenticateRequest hem web session hem mobil Bearer token'ı destekler.
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelName, role, uid } = await request.json()

    if (!channelName) {
      return NextResponse.json({ error: 'channelName is required' }, { status: 400 })
    }

    const appId = process.env.AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      console.error('Agora credentials not configured')
      return NextResponse.json({ error: 'Agora not configured' }, { status: 500 })
    }

    // Token expires in 24 hours
    const expirationTimeInSeconds = 86400
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // Use numeric UID (0 for auto-assign, or hash from user ID)
    const numericUid = uid || 0

    // Determine role: publisher (broadcaster) or subscriber (viewer)
    const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    )

    return NextResponse.json({
      token,
      uid: numericUid,
      channelName,
      appId
    })
  } catch (error) {
    console.error('Agora token error:', error)
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
  }
}
