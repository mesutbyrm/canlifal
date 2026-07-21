import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { voiceTrtcRoomId, userIdToNumericUid } from '@/lib/trtc-room'

export const dynamic = 'force-dynamic'

/**
 * Generate TRTC UserSig on the server side.
 * SDKSecretKey never leaves the server.
 *
 * Supports both mobile JWT and web session auth.
 * Also allows guest viewers with viewer_xxx userId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { userId, roomId } = body

    // Dual auth: try mobile JWT first, fall back to NextAuth session
    const authUser = await authenticateRequest(request)
    // If userId not provided, use authenticated user id
    if (!userId && authUser) {
      userId = authUser.id
    }

    if (!userId || !roomId) {
      return NextResponse.json({ error: 'userId and roomId are required' }, { status: 400 })
    }

    // Support alternative env var names
    const sdkAppId = parseInt(
      process.env.TRTC_SDK_APP_ID ||
      process.env.TENCENT_TRTC_SDK_APP_ID ||
      '0'
    )
    const secretKey =
      process.env.TRTC_SDK_SECRET_KEY ||
      process.env.TRTC_SECRET_KEY ||
      process.env.TENCENT_TRTC_SECRET_KEY ||
      ''

    if (!sdkAppId || !secretKey) {
      console.error('TRTC credentials not configured')
      return NextResponse.json({ error: 'TRTC not configured' }, { status: 500 })
    }

    // Generate UserSig using tls-sig-api-v2
    const TLSSigAPIv2 = require('tls-sig-api-v2')
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey)

    // UserSig expiry from env (default 24 hours)
    const expireTime = parseInt(process.env.TRTC_EXPIRE || '86400')
    const userSig = api.genSig(userId, expireTime)

    return NextResponse.json({
      sdkAppId,
      userId,
      userSig,
      roomId,
      // Canonical TRTC string room id shared by web + Flutter (idempotent).
      trtcRoomId: voiceTrtcRoomId(String(roomId)),
      numericUid: userIdToNumericUid(String(userId)),
    })
  } catch (error) {
    console.error('TRTC UserSig generation error:', error)
    return NextResponse.json({ error: 'UserSig generation failed' }, { status: 500 })
  }
}