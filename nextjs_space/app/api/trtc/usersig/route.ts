import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

/**
 * Generate TRTC UserSig on the server side.
 * SDKSecretKey never leaves the server.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, roomId } = await request.json()

    if (!userId || !roomId) {
      return NextResponse.json({ error: 'userId and roomId are required' }, { status: 400 })
    }

    const sdkAppId = parseInt(process.env.TRTC_SDK_APP_ID || '0')
    const secretKey = process.env.TRTC_SDK_SECRET_KEY

    if (!sdkAppId || !secretKey) {
      console.error('TRTC credentials not configured')
      return NextResponse.json({ error: 'TRTC not configured' }, { status: 500 })
    }

    // Generate UserSig using tls-sig-api-v2
    const TLSSigAPIv2 = require('tls-sig-api-v2')
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey)
    
    // UserSig valid for 24 hours
    const expireTime = 86400
    const userSig = api.genSig(userId, expireTime)

    return NextResponse.json({
      sdkAppId,
      userId,
      userSig,
      roomId,
    })
  } catch (error) {
    console.error('TRTC UserSig generation error:', error)
    return NextResponse.json({ error: 'UserSig generation failed' }, { status: 500 })
  }
}
