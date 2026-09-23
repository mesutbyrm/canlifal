import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { voiceTrtcRoomId, userIdToNumericUid } from '@/lib/trtc-room'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trtc/token
 * Enhanced TRTC UserSig generator for Flutter.
 * JWT-protected — requires mobile auth or web session.
 * Returns: sdkAppId, userId, userSig, roomId, expireTime
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomId, role } = body // role: 'host' | 'audience' (optional, informational)

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ROOM_ID', message: 'roomId gereklidir' } },
        { status: 400 }
      )
    }

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
      console.error('[TRTC/token] TRTC credentials not configured')
      return NextResponse.json(
        { success: false, error: { code: 'TRTC_NOT_CONFIGURED', message: 'TRTC yapılandırılmamış' } },
        { status: 500 }
      )
    }

    const TLSSigAPIv2 = require('tls-sig-api-v2')
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey)
    const expireTime = parseInt(process.env.TRTC_EXPIRE || '86400')
    const userSig = api.genSig(authUser.id, expireTime)

    console.log(`[TRTC/token] userId=${authUser.id} roomId=${roomId} role=${role || 'audience'}`)

    return NextResponse.json({
      success: true,
      data: {
        sdkAppId: sdkAppId || 0,
        userId: authUser.id || '',
        userSig: userSig || '',
        roomId: roomId || '',
        // Canonical TRTC string room id — BOTH web and Flutter must use this to
        // land in the same TRTC room (idempotent if already prefixed).
        trtcRoomId: voiceTrtcRoomId(String(roomId)),
        // Stable numeric uid for SDK paths that require a numeric identity.
        numericUid: userIdToNumericUid(authUser.id),
        expireTime: expireTime || 86400,
        role: role || 'audience',
      }
    })
  } catch (error) {
    console.error('[TRTC/token] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'UserSig oluşturulamadı' } },
      { status: 500 }
    )
  }
}
